import Link from "next/link";
import { loadDashboard } from "@/lib/server/data";
import { CoinIcon, Pct, SignalChip, fmtUsd, Disclaimer } from "@/components/ui";
import { QuickAlert } from "@/components/QuickAlert";
import { TelegramConnect } from "@/components/TelegramConnect";
import { MagnetGauge } from "@/components/MagnetGauge";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function Dashboard() {
  const d = await loadDashboard();
  const name = d.profile?.display_name || d.profile?.near_account || "trader";
  const active = d.alerts.filter((a) => a.status === "active" || a.status === "paused" || (a.status === "fired" && !a.acknowledged_at));
  const snap = (c: string) => d.snaps.find((s) => s.coin === c);
  const sig = (c: string) => d.signals.find((s) => s.coin === c);
  const ago = (iso?: string) => { if (!iso) return ""; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={30} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Dashboard</p>
          <h1 className="display text-3xl font-black sm:text-4xl">Welcome back, {name}</h1>
        </div>
        <TelegramConnect connected={!!d.profile?.telegram_chat_id} />
      </div>

      <section aria-label="Live prices" className="card overflow-x-auto p-2">
        <div className="flex min-w-max">
          {d.watch.map((w) => { const s = snap(w.coin); return (
            <Link key={w.coin} href={`/app/signals?coin=${encodeURIComponent(w.coin)}`} className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-paper">
              <CoinIcon coin={w.coin} size={32} />
              <div><p className="font-bold">{w.coin}</p><p className="num text-sm">{fmtUsd(s ? +s.price : null)} <Pct v={s ? +s.change_24h_pct : null} /></p></div>
            </Link>
          ); })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          <h2 className="display text-xl font-black">Signals for your coins</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {d.watch.map((w) => { const s = sig(w.coin); const sn = snap(w.coin); return (
              <article key={w.coin} className="card p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3"><CoinIcon coin={w.coin} size={36} /><div><h3 className="text-lg font-extrabold">{w.coin}</h3><p className="num text-sm font-semibold text-ink-2">{fmtUsd(sn ? +sn.price : null)}</p></div></div>
                  {s ? <SignalChip direction={s.direction} label={s.label} /> : <span className="chip chip-flat">Waiting for first signal</span>}
                </div>
                {s && (<>
                  <dl className="num mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><dt className="label">Key level</dt><dd className="font-bold">{fmtUsd(+s.key_level)}</dd></div>
                    <div><dt className="label">Entry</dt><dd className="font-bold">{fmtUsd(+s.entry_low)}–{fmtUsd(+s.entry_high)}</dd></div>
                    <div><dt className="label">Stop</dt><dd className="font-bold text-coral">{fmtUsd(+s.stop)}</dd></div>
                    <div><dt className="label">Target</dt><dd className="font-bold text-brand">{fmtUsd(+s.target)}</dd></div>
                  </dl>
                  <p className="mt-3 text-sm font-medium text-ink">{s.reason}</p>
                  <MagnetGauge price={+s.price} factors={s.factors} />
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-2">Updated {ago(s.created_at)} · {s.reason_source === "ai" ? "reason by NEAR AI" : "template reason"}</span>
                    <Link href={`/trade/${encodeURIComponent(w.coin)}`} className="btn btn-primary h-9 px-4 text-sm">Trade</Link>
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
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Your alerts</h2><Link href="/app/alerts" className="text-sm font-bold underline">Manage</Link></div>
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
            <ul className="mt-3 space-y-2">
              {d.notes.slice(0, 6).map((n) => (
                <li key={n.id} className="text-sm"><p className="font-bold">{n.title}</p><p className="text-xs font-semibold text-ink-2">{n.kind} · {ago(n.created_at)} · {n.status === "skipped" ? "shown here (Telegram not connected)" : n.status}</p></li>
              ))}
              {!d.notes.length && <li className="text-sm font-medium text-ink-2">Nothing yet. When an alert fires it shows here and on Telegram.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
