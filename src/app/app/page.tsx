import Link from "next/link";
import { ArrowUpRight, ChevronRight, Layers } from "lucide-react";
import { loadDashboard } from "@/lib/server/data";
import { CoinIcon, Pct, SignalChip, fmtUsd, Disclaimer } from "@/components/ui";
import { QuickAlert } from "@/components/QuickAlert";
import { GetAlertsCard } from "@/components/GetAlertsCard";
import { MagnetGauge } from "@/components/MagnetGauge";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Spark } from "@/components/Spark";
import { WaitLevels } from "@/components/WaitLevels";
import { tidyPrices } from "@/lib/format";

function Corner({ href, label, dark = false }: { href: string; label: string; dark?: boolean }) {
  return (
    <Link href={href} aria-label={label} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 ${dark ? "bg-lime text-night" : "bg-night text-cream"}`}>
      <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
    </Link>
  );
}

const HOME_COINS = 8;   // watchlist cards on the home page
const HOME_SIGNALS = 4; // signal cards on the home page

export default async function Dashboard() {
  const d = await loadDashboard();
  const name = (d.profile?.display_name || d.profile?.near_account || "trader").split(" ")[0];
  const active = d.alerts.filter((a) => a.status === "active" || a.status === "paused" || (a.status === "fired" && !a.acknowledged_at));
  const firedToday = d.alerts.filter((a) => a.fired_at && new Date(a.fired_at).toDateString() === new Date().toDateString()).length;
  const snap = (c: string) => d.snaps.find((s) => s.coin === c);
  const coins = d.watch.map((w) => w.coin);
  const longs = d.signals.filter((s) => s.direction === "long").length, shorts = d.signals.filter((s) => s.direction === "short").length;
  // Setups first (long/short), then the rest; only a few on the home page.
  const sigs = [...d.signals].sort((a, b) => (a.direction === "none" ? 1 : 0) - (b.direction === "none" ? 1 : 0)).slice(0, HOME_SIGNALS);
  const ago = (iso?: string) => { if (!iso) return ""; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const pulse = d.watch.slice(0, 8);

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={30} />
      <header>
        <p className="label">{today}</p>
        <h1 className="display mt-1 text-3xl font-black sm:text-4xl">Welcome back, {name}</h1>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Market pulse */}
        <section className="hero-dark flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between"><p className="label text-mist">Market pulse · your coins</p><Corner href="/app/markets" label="Open markets" dark /></div>
          <p className="display mt-2 text-3xl font-black">{longs > shorts ? "Leaning long" : shorts > longs ? "Leaning short" : "No clear edge"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
            <span className="chip bg-signal text-night">▲ {longs} long</span><span className="chip bg-coral text-white">▼ {shorts} short</span><span className="chip bg-forest text-cream">● {d.signals.length - longs - shorts} wait</span>
          </div>
          {pulse.length > 0 && (
            <div className="mt-4 flex h-24 items-stretch justify-center gap-2.5" aria-label="24 hour change per coin">
              {pulse.map((w) => { const s = snap(w.coin); const v = s ? +s.change_24h_pct : 0; const h = Math.max(12, Math.min(100, Math.abs(v) * 9 + 12)); return (
                <div key={w.coin} className="flex h-full w-full max-w-[44px] flex-col items-center justify-end gap-1">
                  <span className={`num text-[10px] font-extrabold ${v >= 0 ? "text-signal" : "text-coral"}`}>{v >= 0 ? "+" : ""}{v.toFixed(1)}</span>
                  <span className="flex w-full max-w-[18px] flex-1 items-end"><span className={`w-full rounded-full ${v >= 0 ? "bg-signal" : "bg-coral"}`} style={{ height: `${h}%` }} /></span>
                  <span className="text-[10px] font-bold text-mist">{w.coin.replace(/^k/, "").slice(0, 4)}</span>
                </div>
              ); })}
            </div>
          )}
          <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
            <Link href="/app/alerts" className="btn btn-lime h-11 text-sm">+ Add alert</Link>
            <Link href="/app/liquidity" className="btn btn-light h-11 text-sm"><Layers className="h-4 w-4" />Liquidity</Link>
          </div>
        </section>

        <div className="space-y-4">
          <GetAlertsCard telegram={!!d.profile?.telegram_chat_id} />
          <div className="grid grid-cols-2 gap-3">
            {[["Active alerts", String(active.length), "/app/alerts"], ["Targets hit today", String(firedToday), "/app/activity"]].map(([l, v, h]) => (
              <Link key={l} href={h} className="card flex items-center justify-between gap-2 p-4">
                <div><p className="label">{l}</p><p className="display num mt-1 text-3xl font-black">{v}</p></div>
                <ChevronRight className="h-5 w-5 text-ink-2" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Watchlist: swipeable row on phones, grid on desktop; capped on the home page */}
      <section aria-label="Your watchlist">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="display text-2xl font-black">Watchlist</h2>
          <Link href="/app/markets" className="flex items-center gap-1 text-sm font-bold">{coins.length > HOME_COINS ? `See all ${coins.length}` : "Add coins"}<ChevronRight className="h-4 w-4" /></Link>
        </div>
        {coins.length === 0 ? (
          <Link href="/app/markets" className="card flex items-center justify-between p-5"><span className="font-bold">Star coins on the Markets page to follow them here.</span><ChevronRight className="h-5 w-5" /></Link>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-4">
            {d.watch.slice(0, HOME_COINS).map((w, i) => { const s = snap(w.coin); return (
              <Link key={w.coin} href={`/app/signals?coin=${encodeURIComponent(w.coin)}`}
                className={`w-[46%] shrink-0 snap-start overflow-hidden p-4 sm:w-auto ${i === 0 ? "tile-lime shadow-[0_18px_36px_-16px_rgba(110,140,30,0.6)]" : "card"}`}>
                <div className="flex items-center gap-2"><CoinIcon coin={w.coin} size={28} /><span className="truncate font-extrabold">{w.coin}</span></div>
                <p className="display num mt-2 truncate text-xl font-black">{fmtUsd(s ? +s.price : null)}</p>
                <p className="text-xs">{i === 0 ? <b>{s ? `${+s.change_24h_pct >= 0 ? "+" : ""}${(+s.change_24h_pct).toFixed(2)}%` : "–"}</b> : <Pct v={s ? +s.change_24h_pct : null} />}</p>
                <div className="mt-2"><Spark coin={w.coin} group={coins.slice(0, HOME_COINS)} height={34} /></div>
              </Link>
            ); })}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="display text-2xl font-black">Signals</h2>
            <Link href="/app/signals" className="flex items-center gap-1 text-sm font-bold">All signals<ChevronRight className="h-4 w-4" /></Link>
          </div>
          {!sigs.length && <p className="card p-5 text-sm font-semibold text-ink-2">Signals appear here within 15 minutes for the coins you follow.</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {sigs.map((s) => { const sn = snap(s.coin); return (
              <article key={s.coin} className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3"><CoinIcon coin={s.coin} size={38} /><div className="min-w-0"><h3 className="text-lg font-extrabold">{s.coin}</h3><p className="num text-sm font-semibold text-ink-2">{fmtUsd(sn ? +sn.price : +s.price)}</p></div></div>
                  <Corner href={`/app/signals?coin=${encodeURIComponent(s.coin)}`} label={`${s.coin} signal detail`} />
                </div>
                <div className="mt-3"><SignalChip direction={s.direction} label={s.direction === "none" ? "Wait · no clear edge" : s.label} /></div>
                <div className="mt-3">{s.direction === "none" ? <WaitLevels keyLevel={+s.key_level} factors={s.factors} /> : (
                <dl className="num grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-xl bg-paper p-2"><dt className="label">Entry</dt><dd className="truncate font-bold">{fmtUsd(+s.entry_low)}</dd></div>
                  <div className="rounded-xl bg-paper p-2"><dt className="label">Stop</dt><dd className="truncate font-bold text-coral">{fmtUsd(+s.stop)}</dd></div>
                  <div className="rounded-xl bg-paper p-2"><dt className="label">Target</dt><dd className="truncate font-bold text-brand">{fmtUsd(+s.target)}</dd></div>
                </dl>)}</div>
                <p className="mt-3 text-sm font-medium text-ink">{tidyPrices(s.reason, +s.price)}</p>
                <MagnetGauge price={+s.price} factors={s.factors} />
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink-2">Updated {ago(s.created_at)}</span>
                  <Link href={`/trade/${encodeURIComponent(s.coin)}`} className="btn btn-primary h-9 px-5 text-sm">Trade</Link>
                </div>
              </article>
            ); })}
          </div>
          <Disclaimer />
        </section>

        <aside className="space-y-4">
          <QuickAlert />
          <section className="card p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Your alerts</h2><Corner href="/app/alerts" label="Manage alerts" /></div>
            <ul className="mt-3 divide-y divide-line">
              {active.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="flex min-w-0 items-center gap-2"><CoinIcon coin={a.coin} size={22} /><span className="font-bold">{a.coin}</span>
                    <span className="num truncate text-sm font-semibold text-ink-2">{a.kind === "reminder" ? "reminder" : `${a.direction} ${fmtUsd(+a.price)}`}</span></span>
                  <span className={`chip shrink-0 ${a.status === "fired" ? "chip-short" : a.status === "paused" ? "chip-flat" : "chip-long"}`}>{a.status === "fired" ? "Hit" : a.status === "paused" ? "Paused" : "Active"}</span>
                </li>
              ))}
              {!active.length && <li className="py-3 text-sm font-medium text-ink-2">No alerts yet. Add one above.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
