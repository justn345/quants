// Price history for the big chart. Cached at the CDN so many visitors share one Hyperliquid call.
import { json } from "@/lib/server/guard";
import { fetchCandles } from "@/lib/market/hyperliquid";

const RANGES = { "24h": ["15m", 24], "7d": ["1h", 168], "30d": ["4h", 720] } as const;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const coin = u.searchParams.get("coin") ?? "";
  const range = (u.searchParams.get("range") ?? "24h") as keyof typeof RANGES;
  if (!/^[A-Za-z0-9]{1,15}$/.test(coin) || !RANGES[range]) return json({ error: "bad request" }, 400);
  const [interval, hours] = RANGES[range];
  try {
    const c = await fetchCandles(coin, interval, hours);
    return json({ candles: c.map((k) => [k.t, k.o, k.h, k.l, k.c]) }, 200, { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" });
  } catch {
    return json({ candles: [] }, 200);
  }
}
