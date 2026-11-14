// ESTIMATED liquidation clusters. Hyperliquid does not publish other traders' liquidation prices,
// so we model them: open interest is spread over recent entry prices (volume-weighted 15m closes)
// and common leverages, and each (entry, leverage) pair maps to a liquidation price.
import type { Candle } from "./hyperliquid";

export const LEVERAGES = [10, 25, 50, 100] as const;
// Rough share of open interest at each leverage (assumption, documented in README).
const LEVERAGE_WEIGHTS: Record<(typeof LEVERAGES)[number], number> = { 10: 0.4, 25: 0.3, 50: 0.2, 100: 0.1 };
const MAINT_MARGIN = 0.005; // ~0.5% maintenance margin

export interface Cluster {
  side: "long_liq" | "short_liq"; // long_liq = longs get liquidated (below price), short_liq = above
  price: number;
  notionalUsd: number;
  distancePct: number; // signed distance from current price
}

export function estimateClusters(candles: Candle[], price: number, openInterestUsd: number, binPct = 0.0025): Cluster[] {
  if (!candles.length || !price) return [];
  const totalVol = candles.reduce((s, k) => s + k.v, 0) || 1;
  const bins = new Map<string, { side: Cluster["side"]; px: number; usd: number }>();
  const add = (side: Cluster["side"], px: number, usd: number) => {
    const idx = Math.round(Math.log(px / price) / Math.log(1 + binPct));
    const key = `${side}:${idx}`;
    const b = bins.get(key);
    if (b) b.usd += usd;
    else bins.set(key, { side, px: price * (1 + binPct) ** idx, usd });
  };
  // Assume roughly half of OI is long and half short (each position has a counterparty).
  const perSide = openInterestUsd / 2;
  for (const k of candles) {
    const share = k.v / totalVol;
    for (const L of LEVERAGES) {
      const usd = perSide * share * LEVERAGE_WEIGHTS[L];
      const longLiq = k.c * (1 - 1 / L + MAINT_MARGIN);
      const shortLiq = k.c * (1 + 1 / L - MAINT_MARGIN);
      // Only positions that would still be open (not already liquidated by the current price).
      if (longLiq < price) add("long_liq", longLiq, usd);
      if (shortLiq > price) add("short_liq", shortLiq, usd);
    }
  }
  return [...bins.values()]
    .map((b) => ({ side: b.side, price: b.px, notionalUsd: b.usd, distancePct: ((b.px - price) / price) * 100 }))
    .sort((a, b) => b.notionalUsd - a.notionalUsd);
}

/** Biggest cluster on each side within a max distance (default 8%). */
export function nearestMagnets(clusters: Cluster[], maxDistPct = 8) {
  const within = clusters.filter((c) => Math.abs(c.distancePct) <= maxDistPct);
  const above = within.filter((c) => c.side === "short_liq").sort((a, b) => b.notionalUsd - a.notionalUsd)[0];
  const below = within.filter((c) => c.side === "long_liq").sort((a, b) => b.notionalUsd - a.notionalUsd)[0];
  return { above, below };
}
