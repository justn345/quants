"use client";
// Every coin on Hyperliquid: search, filter, follow, and trade (spot via NEAR Intents where available).
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { CoinIcon, Pct, fmtUsd } from "./ui";
import { Spark } from "./Spark";

type Row = { coin: string; price: number; change_24h_pct: number; volume_24h_usd: number; open_interest_usd: number; funding: number; spot_via_intents: boolean; max_leverage: number };
const TABS = [["all", "All coins"], ["near", "Spot via NEAR Intents"], ["gainers", "Top gainers"], ["losers", "Top losers"], ["watch", "Watchlist"]] as const;
const big = (n: number) => !isFinite(n) ? "–" : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}K`;

export function MarketsTable({ rows, watched, uid }: { rows: Row[]; watched: string[]; uid: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("all");
  const [watch, setWatch] = useState(new Set(watched));
  const [limit, setLimit] = useState(40);

  const list = useMemo(() => {
    let r = rows.filter((x) => x.coin.toLowerCase().includes(q.trim().toLowerCase()));
    if (tab === "near") r = r.filter((x) => x.spot_via_intents);
    if (tab === "watch") r = r.filter((x) => watch.has(x.coin));
    if (tab === "gainers") r = [...r].sort((a, b) => b.change_24h_pct - a.change_24h_pct);
    if (tab === "losers") r = [...r].sort((a, b) => a.change_24h_pct - b.change_24h_pct);
    return r;
  }, [rows, q, tab, watch]);

  const avg = rows.length ? rows.slice(0, 30).reduce((s, x) => s + x.change_24h_pct, 0) / Math.min(30, rows.length) : 0;
  const top = rows.slice(0, 4);
  const gain = [...rows].sort((a, b) => b.change_24h_pct - a.change_24h_pct)[0];

  const toggle = async (coin: string) => {
    const sb = browserClient(), n = new Set(watch);
    if (n.has(coin)) { n.delete(coin); await sb.from("watchlist").delete().eq("user_id", uid).eq("coin", coin); }
    else { n.add(coin); await sb.from("watchlist").upsert({ user_id: uid, coin }, { onConflict: "user_id,coin" }); }
    setWatch(n); router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="label">Markets</p><h1 className="display text-3xl font-black sm:text-4xl">Market is {avg >= 0 ? "up" : "down"} <span className={avg >= 0 ? "text-brand" : "text-coral"}>{avg >= 0 ? "+" : ""}{avg.toFixed(2)}%</span></h1>
          <p className="mt-1 text-sm font-semibold text-ink-2">{rows.length} coins live on Hyperliquid · {rows.filter((r) => r.spot_via_intents).length} swappable through NEAR Intents</p></div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {top.map((r, i) => (
          <Link key={r.coin} href={`/app/signals?coin=${encodeURIComponent(r.coin)}`} className={`p-4 ${i === 0 ? "tile-lime shadow-[0_18px_36px_-16px_rgba(110,140,30,0.6)]" : "card"}`}>
            <div className="flex items-center gap-2"><CoinIcon coin={r.coin} size={30} /><span className="font-extrabold">{r.coin}</span><span className="ml-auto text-xs font-bold">{r.change_24h_pct >= 0 ? "+" : ""}{r.change_24h_pct.toFixed(2)}%</span></div>
            <p className="display num mt-3 text-2xl font-black">{fmtUsd(r.price)}</p>
            <div className="mt-1"><Spark coin={r.coin} group={top.map((x) => x.coin)} width={190} height={36} /></div>
          </Link>
        ))}
        {gain && (
          <div className="hero-dark p-5 sm:col-span-2 xl:col-span-1">
            <p className="label text-mist">Top gainer · 24h</p>
            <div className="mt-3 flex items-center gap-2"><CoinIcon coin={gain.coin} size={30} /><span className="text-lg font-extrabold">{gain.coin}</span></div>
            <p className="display num mt-2 text-3xl font-black text-signal">+{gain.change_24h_pct.toFixed(2)}%</p>
            <Link href={`/trade/${encodeURIComponent(gain.coin)}`} className="btn btn-primary mt-3 h-9 w-full text-sm">Trade {gain.coin}</Link>
          </div>
        )}
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex gap-1.5 overflow-x-auto">
            {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`pill-tab shrink-0 ${tab === k ? "on" : ""}`}>{l}</button>)}
          </div>
          <label className="relative w-full sm:w-64"><span className="sr-only">Search coins</span>
            <input className="input h-10 pl-9" placeholder="Search 170+ coins" value={q} onChange={(e) => setQ(e.target.value)} />
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-2" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          </label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="num w-full min-w-[720px] text-left text-sm">
            <thead><tr className="label border-b border-line"><th className="py-3 pl-2">Coin</th><th>Price</th><th>24h</th><th>Volume 24h</th><th>Open interest</th><th>Trade</th><th className="text-center">Watch</th></tr></thead>
            <tbody>
              {list.slice(0, limit).map((r) => (
                <tr key={r.coin} className="border-b border-line/70 hover:bg-paper">
                  <td className="py-3 pl-2"><Link href={`/app/signals?coin=${encodeURIComponent(r.coin)}`} className="flex items-center gap-3 font-extrabold"><CoinIcon coin={r.coin} size={30} />{r.coin}</Link></td>
                  <td className="font-bold">{fmtUsd(r.price)}</td>
                  <td><Pct v={r.change_24h_pct} /></td>
                  <td className="font-semibold">{big(r.volume_24h_usd)}</td>
                  <td className="font-semibold">{big(r.open_interest_usd)}</td>
                  <td>{r.spot_via_intents
                    ? <Link href={`/trade/${encodeURIComponent(r.coin)}`} className="chip chip-long">Spot · NEAR Intents</Link>
                    : <Link href={`/trade/${encodeURIComponent(r.coin)}`} className="chip chip-flat">Perp · up to {r.max_leverage}x</Link>}</td>
                  <td className="text-center"><button onClick={() => toggle(r.coin)} aria-label={`${watch.has(r.coin) ? "Unfollow" : "Follow"} ${r.coin}`} aria-pressed={watch.has(r.coin)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${watch.has(r.coin) ? "bg-night text-signal" : "bg-paper text-ink-2"}`}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill={watch.has(r.coin) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length > limit && <button className="btn btn-ghost mt-4 w-full" onClick={() => setLimit(limit + 60)}>Show more ({list.length - limit} more)</button>}
          {!list.length && <p className="py-6 text-center font-semibold text-ink-2">No coins match.</p>}
        </div>
      </section>
    </div>
  );
}
