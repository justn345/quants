"use client";
// Liquidity Map: pick any coin and a lookback window to see where estimated liquidations are stacked.
import { useState } from "react";
import { LiquidityMap } from "./LiquidityMap";
import { PriceChart } from "./PriceChart";
import { CoinIcon } from "./ui";

const RANGES = [["24h", "24H"], ["48h", "48H"], ["3d", "3D"], ["1w", "1W"]] as const;

export function LiquidityExplorer({ coins, start }: { coins: string[]; start: string }) {
  const [coin, setCoin] = useState(start);
  const [range, setRange] = useState<(typeof RANGES)[number][0]>("48h");
  const quick = ["BTC", "ETH", "SOL", "HYPE", "BNB", "XRP"].filter((c) => coins.includes(c));
  return (
    <div className="space-y-6">
      <div>
        <p className="label">Liquidity map</p>
        <h1 className="display text-3xl font-black sm:text-4xl">Where liquidity is stacked</h1>
        <p className="mt-1 max-w-2xl font-medium text-ink-2">Estimated liquidation levels from open interest and recent entries. Big stacks act like magnets: price is often pulled toward them before it turns. Stack above = possible long toward it. Stack below = possible short toward it.</p>
      </div>

      <section className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-[200px] flex-1 items-center gap-2 sm:flex-none">
            <span className="sr-only">Coin</span>
            <CoinIcon coin={coin} size={32} />
            <select className="input h-11 font-bold" value={coin} onChange={(e) => setCoin(e.target.value)}>
              {coins.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <div role="tablist" aria-label="Lookback" className="flex gap-1 rounded-full bg-paper p-1">
            {RANGES.map(([k, l]) => <button key={k} role="tab" aria-selected={range === k} onClick={() => setRange(k)} className={`h-9 rounded-full px-4 text-sm font-extrabold ${range === k ? "bg-night text-signal" : ""}`}>{l}</button>)}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {quick.map((c) => <button key={c} onClick={() => setCoin(c)} className={`pill-tab flex shrink-0 items-center gap-2 ${c === coin ? "on" : ""}`}><CoinIcon coin={c} size={18} />{c}</button>)}
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="card p-4 sm:p-6"><LiquidityMap coin={coin} range={range} rows={14} /></section>
        <section className="hero-dark p-4 sm:p-6"><PriceChart coin={coin} dark /></section>
      </div>
    </div>
  );
}
