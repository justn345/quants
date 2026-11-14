"use client";
// Liquidity ladder: where ESTIMATED liquidations are stacked above (shorts) and below (longs) the price.
// Price tends to be pulled toward big stacks, like reading a liquidation heatmap.
import { useEffect, useState } from "react";
import { fmtUsd } from "./ui";

type L = { price: number; usd: number; side: "long_liq" | "short_liq"; distancePct: number };
type R = { price: number; levels: L[]; strongestAbove: L | null; strongestBelow: L | null; openInterestUsd: number };
const big = (n: number) => n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}K`;

export function LiquidityMap({ coin, range = "48h", rows = 10 }: { coin: string; range?: string; rows?: number }) {
  const [d, setD] = useState<R | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    setD(null); setErr(false);
    fetch(`/api/liqmap?coin=${encodeURIComponent(coin)}&range=${range}`).then((r) => r.json()).then((j) => { if (!alive) return; if (j.levels) setD(j); else setErr(true); }).catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [coin, range]);

  if (err) return <p className="text-sm font-semibold text-ink-2">Liquidity map unavailable right now.</p>;
  if (!d) return <div className="h-64 animate-pulse rounded-2xl bg-paper" aria-label="Loading liquidity map" />;
  const above = d.levels.filter((l) => l.price > d.price).slice(-rows);
  const below = d.levels.filter((l) => l.price < d.price).slice(0, rows);
  // Summary comes from exactly the bars shown, so the numbers always match the list.
  const top = (xs: L[]) => xs.reduce<L | null>((m, l) => (!m || l.usd > m.usd ? l : m), null);
  const sAbove = top(above), sBelow = top(below);
  const max = Math.max(...above.map((l) => l.usd), ...below.map((l) => l.usd), 1);
  const Row = ({ l }: { l: L }) => {
    const w = Math.max(3, (l.usd / max) * 100);
    const strong = (sAbove && l.price === sAbove.price) || (sBelow && l.price === sBelow.price);
    return (
      <div className="grid grid-cols-[86px_1fr_70px] items-center gap-2 text-xs">
        <span className="num text-right font-bold">{fmtUsd(l.price)}</span>
        <span className="relative h-4 rounded-full bg-paper">
          <span className={`absolute inset-y-0 left-0 rounded-full ${l.side === "short_liq" ? "bg-coral" : "bg-brand"}`} style={{ width: `${w}%`, opacity: 0.35 + 0.65 * (l.usd / max) }} />
          {strong && <span className="absolute -top-0.5 right-1 text-[10px] font-black">◆ magnet</span>}
        </span>
        <span className="num font-semibold text-ink-2">{big(l.usd)}</span>
      </div>
    );
  };
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sAbove && <div className="rounded-2xl bg-[#fbe1dc] p-3"><p className="label text-[#8f2a1b]">Biggest stack above</p><p className="num font-extrabold">{fmtUsd(sAbove.price)} <span className="text-sm">(+{sAbove.distancePct.toFixed(1)}%)</span></p><p className="text-xs font-semibold">Short liquidations ≈ {big(sAbove.usd)}: price may get pulled up to it.</p></div>}
        {sBelow && <div className="rounded-2xl bg-[#d6f9ea] p-3"><p className="label text-[#04563a]">Biggest stack below</p><p className="num font-extrabold">{fmtUsd(sBelow.price)} <span className="text-sm">({sBelow.distancePct.toFixed(1)}%)</span></p><p className="text-xs font-semibold">Long liquidations ≈ {big(sBelow.usd)}: a sweep could wick down here.</p></div>}
      </div>
      <div className="mt-4 space-y-1.5">
        {above.map((l) => <Row key={`a${l.price}`} l={l} />)}
        <div className="grid grid-cols-[86px_1fr_70px] items-center gap-2 py-1 text-xs">
          <span className="num rounded-full bg-night px-2 py-0.5 text-right font-black text-signal">{fmtUsd(d.price)}</span>
          <span className="h-0.5 rounded bg-night" /><span className="font-black">Now</span>
        </div>
        {below.map((l) => <Row key={`b${l.price}`} l={l} />)}
      </div>
      <p className="mt-3 text-xs font-semibold text-ink-2">Estimated from open interest ({big(d.openInterestUsd)}) and recent entries at 10x/25x/50x/100x leverage. Not real positions.</p>
    </div>
  );
}
