// 24h hourly closes for small charts. One Hyperliquid call per coin, cached 10 minutes at the CDN.
import { json } from "@/lib/server/guard";
import { fetchCandles } from "@/lib/market/hyperliquid";

export async function GET(req: Request) {
  const coins = (new URL(req.url).searchParams.get("coins") ?? "").split(",").filter((c) => /^[A-Za-z0-9]{1,15}$/.test(c)).slice(0, 12);
  const out: Record<string, number[]> = {};
  await Promise.all(coins.map(async (c) => {
    try { out[c] = (await fetchCandles(c, "1h", 24)).map((k) => k.c); } catch { out[c] = []; }
  }));
  return json({ spark: out }, 200, { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" });
}
