import Link from "next/link";
import { loadDashboard } from "@/lib/server/data";
import { CoinIcon, Pct, SignalChip, fmtUsd, Disclaimer } from "@/components/ui";
import { QuickAlert } from "@/components/QuickAlert";
import { TelegramConnect } from "@/components/TelegramConnect";
import { MagnetGauge } from "@/components/MagnetGauge";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Spark } from "@/components/Spark";

function Corner({ href, label, dark = false }: { href: string; label: string; dark?: boolean }) {
  return (
    <Link href={href} aria-label={label} className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:-translate-y-0.5 ${dark ? "bg-lime text-night" : "bg-night text-cream"}`}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M7 17L17 7M9 7h8v8" /></svg>
    </Link>
  );
}

export default async function Dashboard() {
  const d = await loadDashboard();
  const name = d.profile?.display_name || d.profile?.near_account || "trader";
  const active = d.alerts.filter((a) => a.status === "active" || a.status === "paused" || (a.status === "fired" && !a.acknowledged_at));
  const firedToday = d.alerts.filter((a) => a.fired_at && new Date(a.fired_at).toDateString() === new Date().toDateString()).length;
  const snap = (c: string) => d.snaps.find((s) => s.coin === c);
  const sig = (c: string) => d.signals.find((s) => s.coin === c);
  const coins = d.watch.map((w) => w.coin);
  const longs = d.signals.filter((s) => s.direction === "long").length, shorts = d.signals.filter((s) => s.direction === "short").length;
  const ago = (iso?: string) => { if (!iso) return ""; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={30} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{today}</p>
          <h1 className="display mt-1 text-3xl font-black sm:text-4xl">Welcome back, {name}</h1>
        </div>
        <TelegramConnect connected={!!d.profile?.telegram_chat_id} />
      </div>

      {/* Stat tiles */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-[22px] bg-night p-5 text-cream shadow-[0_24px_48px_-20px_rgba(15,42,29,0.7)] sm:col-span-2 xl:col-span-1">
          <div className="flex items-start justify-between"><p className="label text-mist">Market mood · your coins</p><Corner href="/app/signals" label="Open signals" dark /></div>
          <p className="display mt-3 text-4xl font-black">{longs > shorts ? "Leaning long" : shorts > longs ? "Leaning short" : "No clear edge"}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            <span className="chip bg-signal text-night">▲ {longs} long</span><span className="chip bg-coral text-white">▼ {shorts} short</span><span className="chip bg-forest text-cream">● {d.signals.length - longs - shorts} flat</span>
          </div>
        </div>
        {[
          ["Active alerts", String(active.length), "/app/alerts", `${d.alerts.filter((a) => a.status === "paused").length} paused`],
          ["Fired today", String(firedToday), "/app/alerts", "repeats until you tap Got it"],
          ["Coins you follow", String(coins.length), "/app/settings", "of 179 on Hyperliquid"],
        ].map(([l, v, h, sub]) => (
          <div key={l} className="card p-5">
            <div className="flex items-start justify-between"><p className="label">{l}</p><Corner href={h} label={`Open ${l}`} /></div>
            <p className="display num mt-3 text-4xl font-black">{v}</p>
            <p className="mt-1 text-sm font-semibold text-ink-2">{sub}</p>
          </div>
        ))}
      </section>

      {/* Price cards */}
      <section aria-label="Live prices" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {d.watch.map((w) => { const s = snap(w.coin); return (
          <Link key={w.coin} href={`/app/signals?coin=${encodeURIComponent(w.coin)}`} className="card p-4">
            <div className="flex items-center gap-2"><CoinIcon coin={w.coin} size={28} /><span className="font-extrabold">{w.coin}</span><span className="ml-auto text-xs"><Pct v={s ? +s.change_24h_pct : null} /></span></div>
            <p className="display num mt-3 text-xl font-black">{fmtUsd(s ? +s.price : null)}</p>
            <div className="mt-2"><Spark coin={w.coin} group={coins} width={150} height={34} /></div>
          </Link>
        ); })}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <div className="flex items-end justify-between"><h2 className="display text-2xl font-black">Signals for your coins</h2><span className="text-xs font-bold text-ink-2">Every 15 min · reasons by NEAR AI</span></div>
          <div className="grid gap-4 md:grid-cols-2">
            {d.watch.map((w) => { const s = sig(w.coin); const sn = snap(w.coin); return (
              <article key={w.coin} className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3"><CoinIcon coin={w.coin} size={40} /><div><h3 className="text-lg font-extrabold">{w.coin}</h3><p className="num text-sm font-semibold text-ink-2">{fmtUsd(sn ? +sn.price : null)}</p></div></div>
                  <Corner href={`/app/signals?coin=${encodeURIComponent(w.coin)}`} label={`${w.coin} signal detail`} />
                </div>
                <div className="mt-3">{s ? <SignalChip direction={s.direction} label={s.label} /> : <span className="chip chip-flat">Waiting for first signal</span>}</div>
                {s && (<>
                  <dl className="num mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-paper p-2.5"><dt className="label">Key level</dt><dd className="font-bold">{fmtUsd(+s.key_level)}</dd></div>
                    <div className="rounded-xl bg-paper p-2.5"><dt className="label">Entry</dt><dd className="font-bold">{fmtUsd(+s.entry_low)}–{fmtUsd(+s.entry_high)}</dd></div>
                    <div className="rounded-xl bg-paper p-2.5"><dt className="label">Stop</dt><dd className="font-bold text-coral">{fmtUsd(+s.stop)}</dd></div>
                    <div className="rounded-xl bg-paper p-2.5"><dt className="label">Target</dt><dd className="font-bold text-brand">{fmtUsd(+s.target)}</dd></div>
                  </dl>
                  <p className="mt-3 text-sm font-medium text-ink">{s.reason}</p>
                  <MagnetGauge price={+s.price} factors={s.factors} />
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-ink-2">Updated {ago(s.created_at)}</span>
                    <Link href={`/trade/${encodeURIComponent(w.coin)}`} className="btn btn-primary h-9 px-5 text-sm">Trade</Link>
                  </div>
                </>)}
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
              {active.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                  <span className="flex items-center gap-2"><CoinIcon coin={a.coin} size={22} /><span className="font-bold">{a.coin}</span>
                    <span className="num text-sm font-semibold text-ink-2">{a.kind === "reminder" ? `reminder ${new Date(a.remind_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}` : `${a.direction} ${fmtUsd(+a.price)}`}</span></span>
                  <span className={`chip ${a.status === "fired" ? "chip-short" : a.status === "paused" ? "chip-flat" : "chip-long"}`}>{a.status === "fired" ? "Fired" : a.status === "paused" ? "Paused" : "Active"}</span>
                </li>
              ))}
              {!active.length && <li className="py-3 text-sm font-medium text-ink-2">No alerts yet. Add one above.</li>}
            </ul>
          </section>
          <section className="card p-5">
            <h2 className="text-lg font-extrabold">Recent notifications</h2>
            <ul className="mt-3 space-y-3">
              {d.notes.slice(0, 6).map((n) => (
                <li key={n.id} className="flex gap-3 text-sm"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.kind === "price" || n.kind === "reminder" ? "bg-brand" : n.kind === "magnet" ? "bg-coral" : "bg-sage"}`} /><span><span className="block font-bold">{n.title}</span><span className="text-xs font-semibold text-ink-2">{ago(n.created_at)} · {n.status === "skipped" ? "shown here (Telegram not connected)" : n.status}</span></span></li>
              ))}
              {!d.notes.length && <li className="text-sm font-medium text-ink-2">Nothing yet. When an alert fires it shows here and on Telegram.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
