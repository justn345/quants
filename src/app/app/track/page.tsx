import { currentUser } from "@/lib/supabase/server";
import { SignalChip, fmtUsd } from "@/components/ui";

export default async function TrackPage() {
  const { sb } = await currentUser();
  const { data } = await sb.from("signals").select("id,coin,direction,label,price,stop,target,created_at,outcome_4h,outcome_24h")
    .neq("direction", "none").order("created_at", { ascending: false }).limit(300);
  const rows = data ?? [];
  const scored = (k: "outcome_4h" | "outcome_24h") => rows.filter((r) => r[k] && r[k] !== "no_trade");
  const rate = (k: "outcome_4h" | "outcome_24h") => { const s = scored(k); return s.length ? Math.round((s.filter((r) => r[k] === "hit_target").length / s.length) * 100) : null; };
  const cell = (o: string | null) => o === "hit_target" ? "bg-brand" : o === "hit_stop" ? "bg-coral" : o === "neither" ? "bg-mist" : "bg-white ring-1 ring-line";
  return (
    <div className="space-y-6">
      <div><p className="label">Track record</p><h1 className="display text-3xl font-black sm:text-4xl">Public track record</h1>
        <p className="mt-1 text-sm font-bold text-brand">All Quants AI signals across every coin, the same for every user. Not your personal history: that is on the Activity page.</p>
        <p className="mt-2 font-medium text-ink-2">Each long/short signal is checked after 4h and 24h: did price hit the target or the stop first? If both happened in the same 15-minute candle, we count it as a stop.</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[["Hit rate after 4h", rate("outcome_4h"), scored("outcome_4h").length], ["Hit rate after 24h", rate("outcome_24h"), scored("outcome_24h").length], ["Signals logged", rows.length, null]].map(([l, v, n]) => (
          <div key={l as string} className="card p-5"><p className="label">{l}</p><p className="display num mt-2 text-4xl font-black">{v == null ? "–" : l === "Signals logged" ? v : `${v}%`}</p>{n != null && <p className="text-sm font-semibold text-ink-2">{n ? `${n} scored` : "Scoring starts 4h after the first signal"}</p>}</div>
        ))}
      </div>
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-extrabold">Each dot is a signal (4h result)</h2>
          <div className="flex gap-3 text-xs font-bold"><span className="flex items-center gap-1"><i className="h-3 w-3 rounded-full bg-brand" />Target</span><span className="flex items-center gap-1"><i className="h-3 w-3 rounded-full bg-coral" />Stop</span><span className="flex items-center gap-1"><i className="h-3 w-3 rounded-full bg-mist" />Neither</span><span className="flex items-center gap-1"><i className="h-3 w-3 rounded-full bg-white ring-1 ring-line" />Pending</span></div></div>
        <div className="mt-4 flex flex-wrap gap-1.5">{rows.map((r) => <span key={r.id} title={`${r.coin} ${r.label} · ${r.outcome_4h ?? "pending"}`} className={`h-4 w-4 rounded-full ${cell(r.outcome_4h)}`} />)}</div>
        {!rows.length && <p className="mt-2 text-sm font-medium text-ink-2">No long/short signals yet. &quot;No clear edge&quot; readings are not counted.</p>}
      </section>
      {rows.length > 0 && (
        <section className="card overflow-x-auto p-2">
          <table className="num w-full min-w-[640px] text-left text-sm">
            <thead><tr className="label"><th className="p-3">Time</th><th className="p-3">Coin</th><th className="p-3">Signal</th><th className="p-3">Price</th><th className="p-3">Stop / Target</th><th className="p-3">4h</th><th className="p-3">24h</th></tr></thead>
            <tbody className="divide-y divide-line">{rows.slice(0, 100).map((r) => (
              <tr key={r.id}><td className="p-3 font-semibold">{new Date(r.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td className="p-3 font-bold">{r.coin}</td><td className="p-3"><SignalChip direction={r.direction} label={r.label} /></td><td className="p-3 font-bold">{fmtUsd(+r.price)}</td><td className="p-3 font-semibold">{fmtUsd(+r.stop)} / {fmtUsd(+r.target)}</td><td className="p-3 font-semibold">{r.outcome_4h?.replace("_", " ") ?? "pending"}</td><td className="p-3 font-semibold">{r.outcome_24h?.replace("_", " ") ?? "pending"}</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  );
}
