// Estimated liquidation map (free alternative to paid liquidation heatmaps).
// Built from Hyperliquid open interest + 24h of 15m volume-weighted entries at 10x/25x/50x/100x.
import { json } from "@/lib/server/guard";
import { fetchAssetCtxs, fetchCandles } from "@/lib/market/hyperliquid";
import { estimateClusters } from "@/lib/market/liquidations";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const coin = u.searchParams.get("coin") ?? "";
  const RANGES = { "24h": ["15m", 24], "48h": ["15m", 48], "3d": ["1h", 72], "1w": ["1h", 168] } as const;
  const range = (u.searchParams.get("range") ?? "48h") as keyof typeof RANGES;
  if (!RANGES[range]) return json({ error: "bad range" }, 400);
  if (!/^[A-Za-z0-9]{1,15}$/.test(coin)) return json({ error: "bad coin" }, 400);
  try {
    const [ctxs, candles] = await Promise.all([fetchAssetCtxs(), fetchCandles(coin, RANGES[range][0], RANGES[range][1])]);
    const ctx = ctxs[coin];
    if (!ctx) return json({ error: "unknown coin" }, 404);
    const price = ctx.markPx;
    // Wider bins for a readable ladder: 0.5% steps, within ±12% of price.
    const raw = estimateClusters(candles, price, ctx.openInterestUsd, 0.005).filter((c) => Math.abs(c.distancePct) <= 12);
    const levels = raw.sort((a, b) => b.price - a.price).map((c) => ({ price: c.price, usd: Math.round(c.notionalUsd), side: c.side, distancePct: +c.distancePct.toFixed(2) }));
    const above = levels.filter((l) => l.side === "short_liq").sort((a, b) => b.usd - a.usd)[0] ?? null;
    const below = levels.filter((l) => l.side === "long_liq").sort((a, b) => b.usd - a.usd)[0] ?? null;
    return json({ coin, range, price, openInterestUsd: Math.round(ctx.openInterestUsd), levels, strongestAbove: above, strongestBelow: below },
      200, { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}
