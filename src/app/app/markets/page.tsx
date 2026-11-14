import { currentUser } from "@/lib/supabase/server";
import { MarketsTable } from "@/components/MarketsTable";

export default async function MarketsPage() {
  const { sb, user } = await currentUser();
  const [{ data: snaps }, { data: wl }] = await Promise.all([
    sb.from("market_snapshots").select("coin,price,change_24h_pct,volume_24h_usd,open_interest_usd,funding,spot_via_intents,max_leverage").order("volume_24h_usd", { ascending: false, nullsFirst: false }),
    sb.from("watchlist").select("coin").eq("user_id", user!.id),
  ]);
  return <MarketsTable rows={(snaps ?? []).map((s) => ({ ...s, price: +s.price, change_24h_pct: +s.change_24h_pct, volume_24h_usd: +s.volume_24h_usd, open_interest_usd: +s.open_interest_usd, funding: +s.funding }))} watched={(wl ?? []).map((w) => w.coin)} uid={user!.id} />;
}
