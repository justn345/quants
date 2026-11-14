import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { CoinIcon, SignalChip, fmtUsd, Disclaimer } from "@/components/ui";
import { MagnetGauge } from "@/components/MagnetGauge";
import type { SignalRow } from "@/lib/server/data";

export default async function SignalsPage({ searchParams }: { searchParams: Promise<{ coin?: string }> }) {
  const { sb, user } = await currentUser();
  const { data: wl } = await sb.from("watchlist").select("coin").eq("user_id", user!.id);
  const coins = (wl ?? []).map((w) => w.coin);
  const sp = await searchParams;
  const coin = sp.coin && /^[A-Za-z0-9]{1,15}$/.test(sp.coin) ? sp.coin : coins[0] ?? "BTC";
  const { data: hist } = await sb.from("signals").select("*").eq("coin", coin).order("created_at", { ascending: false }).limit(24);
  const rows = (hist ?? []) as SignalRow[];
  const s = rows[0];
  const f = (s?.factors ?? {}) as Record<string, number | null>;
  const bar = (v: number | null | undefined, label: string, note: string) => (
    <div>
      <div className="flex justify-between text-sm"><span className="font-bold">{label}</span><span className="font-semibold text-ink-2">{note}</span></div>
      <div className="relative mt-1 h-2 rounded-full bg-line"><span className="absolute top-0 h-2 rounded-full" style={{ left: `${50 + Math.min(0, (v ?? 0) * 50)}%`, width: `${Math.abs(v ?? 0) * 50}%`, background: (v ?? 0) >= 0 ? "#007D10" : "#E5604D" }} /><span className="absolute left-1/2 top-[-3px] h-3.5 w-0.5 bg-ink" /></div>
    </div>
  );
  return (
    <div className="space-y-6">
      <div><p className="label">Signals</p><h1 className="display text-3xl font-black sm:text-4xl">Signal detail</h1></div>
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Coins">
        {coins.map((c) => <Link key={c} href={`/app/signals?coin=${encodeURIComponent(c)}`} className={`chip shrink-0 px-3 py-2 text-sm ${c === coin ? "bg-night text-cream" : "bg-white text-ink ring-1 ring-line"}`}>{c}</Link>)}
      </nav>
      {!s ? <p className="card p-6 font-medium text-ink-2">No signal for {coin} yet. Signals are computed every 15 minutes for coins people follow.</p> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <article className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><CoinIcon coin={coin} size={44} /><div><h2 className="display text-2xl font-black">{coin}</h2><p className="num font-semibold text-ink-2">{fmtUsd(+s.price)}</p></div></div>
              <SignalChip direction={s.direction} label={s.label} />
            </div>
            <p className="mt-5 text-lg font-semibold">{s.reason}</p>
            <dl className="num mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[["Key level", s.key_level, ""], ["Entry", null, `${fmtUsd(+s.entry_low)}–${fmtUsd(+s.entry_high)}`], ["Stop", s.stop, "text-coral"], ["Target", s.target, "text-brand"]].map(([l, v, c]) => (
                <div key={l as string} className="rounded-2xl bg-paper p-3"><dt className="label">{l}</dt><dd className={`mt-1 font-extrabold ${v == null ? "" : c}`}>{v == null ? c : fmtUsd(+(v as number))}</dd></div>
              ))}
            </dl>
            <MagnetGauge price={+s.price} factors={s.factors} />
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/trade/${encodeURIComponent(coin)}`} className="btn btn-primary">Trade {coin}</Link>
            </div>
            <div className="mt-6"><Disclaimer /></div>
          </article>
          <aside className="card space-y-4 p-6">
            <h3 className="text-lg font-extrabold">What went into it</h3>
            {bar(f.trend, "Trend", `4h ${(f.ret4hPct ?? 0).toFixed(2)}%`)}
            {bar(f.funding, "Funding (contrarian)", `${((f.fundingHourly ?? 0) * 100).toFixed(4)}%/h`)}
            {bar(f.oi, "Open interest", f.oiChangePct == null ? "first reading" : `${(f.oiChangePct as number).toFixed(2)}%`)}
            {bar(f.book, "Order book walls", `bid/ask ${(f.bookImbalance ?? 1).toFixed(2)}`)}
            {bar(f.magnet, "Liquidation magnet", "estimated")}
            <p className="text-xs font-semibold text-ink-2">Score {s.score} · Long above +1.2, short below −1.2. Liquidation clusters are modelled from open interest at 10x/25x/50x/100x.</p>
          </aside>
        </div>
      )}
      {rows.length > 1 && (
        <section className="card overflow-x-auto p-2">
          <table className="num w-full min-w-[560px] text-left text-sm">
            <thead><tr className="label"><th className="p-3">Time</th><th className="p-3">Signal</th><th className="p-3">Price</th><th className="p-3">Stop / Target</th><th className="p-3">4h</th></tr></thead>
            <tbody className="divide-y divide-line">{rows.slice(1).map((r) => (
              <tr key={r.id}><td className="p-3 font-semibold">{new Date(r.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td className="p-3"><SignalChip direction={r.direction} label={r.label} /></td><td className="p-3 font-bold">{fmtUsd(+r.price)}</td><td className="p-3 font-semibold">{fmtUsd(+r.stop)} / {fmtUsd(+r.target)}</td><td className="p-3 font-semibold">{r.outcome_4h?.replace("_", " ") ?? "pending"}</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  );
}
