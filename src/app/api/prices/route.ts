// Shared cached price feed: one database read serves every visitor (CDN cache 15s).
import { adminClient } from "@/lib/supabase/server";
import { json } from "@/lib/server/guard";

export const revalidate = 15;

export async function GET() {
  const { data } = await adminClient()
    .from("market_snapshots")
    .select("coin,price,change_24h_pct,volume_24h_usd,spot_via_intents,max_leverage,updated_at")
    .order("volume_24h_usd", { ascending: false, nullsFirst: false });
  return json({ coins: data ?? [] }, 200, { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" });
}
