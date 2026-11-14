import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { CoinIcon, SignalChip, fmtUsd, Disclaimer, Pct } from "@/components/ui";
import { MagnetGauge } from "@/components/MagnetGauge";
import { PriceChart } from "@/components/PriceChart";
import type { SignalRow } from "@/lib/server/data";

export default async function SignalsPage({ searchParams }: { searchParams: Promise<{ coin?: string }> }) {
  const { sb, user } = await currentUser();
  const { data: wl } = await sb.from("watchlist").select("coin").eq("user_id", user!.id);
  const coins = (wl ?? []).map((w) => w.coin);
  const sp = await searchParams;
  const coin = sp.coin && /^[A-Za-z0-9]{1,15}$/.test(sp.coin) ? sp.coin : coins[0] ?? "BTC";
  const [{ data: hist }, { data: snap }] = await Promise.all([
    sb.from("signals").select("*").eq("coin", coin).order("created_at", { ascending: false }).limit(24),
    sb.from("market_snapshots").select("price,change_24h_pct,funding,open_interest_usd,volume_24h_usd,spot_via_intents,max_leverage").eq("coin", coin).maybeSingle(),
  ]);
  const rows = (hist ?? []) as SignalRow[];
  const s = rows[0];
  const f = (s?.factors ?? {}) as Record<string, number | null>;
  const bar = (v: number | null | undefined, label: string, note: string) => (
    <div>
      <div className="flex justify-between text-sm"><span className="font-bold">{label}</span><span className="font-semibold text-ink-2">{note}</span></div>
      <div className="relative mt-1.5 h-2.5 rounded-full bg-paper"><span className="absolute top-0 h-2.5 rounded-full" style={{ left: `${50 + Math.min(0, (v ?? 0) * 50)}%`, width: `${Math.abs(v ?? 0) * 50}%`, background: (v ?? 0) >= 0 ? "#007D10" : "#E5604D" }} /><span className="absolute left-1/2 top-[-3px] h-4 w-0.5 bg-ink" /></div>
    </div>
  );
  const big = (n?: number | null) => n == null ? "–" : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : `$${(n / 1e6).toFixed(1)}M`;

  return (
    <div className="space-y-6">
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Your coins">
        {coins.map((c) => <Link key={c} href={`/app/signals?coin=${encodeURIComponent(c)}`} className={`pill-tab flex shrink-0 items-center gap-2 ${c === coin ? "on" : ""}`}><CoinIcon coin={c} size={18} />{c}</Link>)}
        <Link href="/app/markets" className="pill-tab flex shrink-0 items-center">+ All coins</Link>
      </nav>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        <section className="hero-dark p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><CoinIcon coin={coin} size={44} /><div><h1 className="display text-2xl font-black">{coin} / USD</h1><p className="text-sm font-semibold text-mist">Hyperliquid perpetual · 24h <Pct v={snap ? +snap.change_24h_pct : null} /></p></div></div>
            {s ? <SignalChip direction={s.direction} label={s.label} /> : <span className="chip bg-forest text-cream">No signal yet</span>}
          </div>
          <PriceChart coin={coin} dark levels={s && s.direction !== "none" ? { stop: +s.stop, target: +s.target } : undefined} />
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Volume 24h", big(snap ? +snap.volume_24h_usd : null)], ["Open interest", big(snap ? +snap.open_interest_usd : null)], ["Funding / h", snap ? `${(+snap.funding * 100).toFixed(4)}%` : "–"], ["Max leverage", snap ? `${snap.max_leverage}x` : "–"]].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-[#163a29] p-3"><p className="label text-mist">{l}</p><p className="num mt-1 font-extrabold">{v}</p></div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <h2 className="text-lg font-extrabold">Trade plan</h2>
            {s ? (<>
              <dl className="num mt-3 grid grid-cols-2 gap-2 text-sm">
                {[["Key level", fmtUsd(+s.key_level), ""], ["Entry", `${fmtUsd(+s.entry_low)}–${fmtUsd(+s.entry_high)}`, ""], ["Stop", fmtUsd(+s.stop), "text-coral"], ["Target", fmtUsd(+s.target), "text-brand"]].map(([l, v, c]) => (
                  <div key={l} className="rounded-xl bg-paper p-2.5"><dt className="label">{l}</dt><dd className={`mt-0.5 font-extrabold ${c}`}>{v}</dd></div>
                ))}
              </dl>
              <p className="mt-3 text-sm font-medium">{s.reason}</p>
              <p className="mt-2 text-xs font-semibold text-ink-2">{s.reason_source === "ai" ? "Reason written by NEAR AI" : "Template reason"} · {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              <MagnetGauge price={+s.price} factors={s.factors} />
            </>) : <p className="mt-2 text-sm font-medium text-ink-2">Signals are computed every 15 minutes for coins people follow. Follow {coin} on the Markets page to start getting them.</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href={`/trade/${encodeURIComponent(coin)}`} className="btn btn-primary">{snap?.spot_via_intents ? "Buy / Sell" : "Trade"}</Link>
              <Link href="/app/alerts" className="btn btn-ghost">Set alert</Link>
            </div>
          </section>
          {s && (
            <section className="card space-y-4 p-5">
              <h3 className="text-lg font-extrabold">What went into it</h3>
              {bar(f.trend, "Trend", `4h ${(f.ret4hPct ?? 0).toFixed(2)}%`)}
              {bar(f.funding, "Funding (contrarian)", `${((f.fundingHourly ?? 0) * 100).toFixed(4)}%/h`)}
              {bar(f.oi, "Open interest", f.oiChangePct == null ? "first reading" : `${(f.oiChangePct as number).toFixed(2)}%`)}
              {bar(f.book, "Order book walls", `bid/ask ${(f.bookImbalance ?? 1).toFixed(2)}`)}
              {bar(f.magnet, "Liquidation magnet", "estimated")}
              <p className="text-xs font-semibold text-ink-2">Score {s.score}. Leaning long above +1.2, short below −1.2.</p>
            </section>
          )}
        </aside>
      </div>

      {rows.length > 1 && (
        <section className="card overflow-x-auto p-2">
          <h3 className="px-3 pt-3 text-lg font-extrabold">Recent signals for {coin}</h3>
          <table className="num w-full min-w-[560px] text-left text-sm">
            <thead><tr className="label"><th className="p-3">Time</th><th className="p-3">Signal</th><th className="p-3">Price</th><th className="p-3">Stop / Target</th><th className="p-3">4h result</th></tr></thead>
            <tbody className="divide-y divide-line">{rows.slice(1).map((r) => (
              <tr key={r.id}><td className="p-3 font-semibold">{new Date(r.created_at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td className="p-3"><SignalChip direction={r.direction} label={r.label} /></td><td className="p-3 font-bold">{fmtUsd(+r.price)}</td><td className="p-3 font-semibold">{fmtUsd(+r.stop)} / {fmtUsd(+r.target)}</td><td className="p-3 font-semibold">{r.outcome_4h?.replace("_", " ") ?? "pending"}</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}
      <Disclaimer />
    </div>
  );
}
