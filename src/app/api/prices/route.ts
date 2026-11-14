// Shared cached price feed: one database read serves every visitor (CDN cache 15s).
// Also returns the latest signal for the featured coins, so the landing page never contradicts live data.
import { adminClient } from "@/lib/supabase/server";
import { json } from "@/lib/server/guard";

export const revalidate = 15;

export async function GET() {
  const db = adminClient();
  const [{ data }, { data: sigs }] = await Promise.all([
    db.from("market_snapshots").select("coin,price,change_24h_pct,volume_24h_usd,spot_via_intents,max_leverage,updated_at").order("volume_24h_usd", { ascending: false, nullsFirst: false }),
    db.from("latest_signals").select("coin,direction,label,price,key_level,entry_low,entry_high,stop,target,reason,created_at").in("coin", ["BTC", "ETH", "SOL", "BNB", "HYPE"]),
  ]);
  return json({ coins: data ?? [], signals: sigs ?? [] }, 200, { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" });
}
