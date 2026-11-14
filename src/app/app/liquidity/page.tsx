import { currentUser } from "@/lib/supabase/server";
import { LiquidityExplorer } from "@/components/LiquidityExplorer";

export const metadata = { title: "Liquidity map | Quants AI" };

export default async function LiquidityPage({ searchParams }: { searchParams: Promise<{ coin?: string }> }) {
  const { sb } = await currentUser();
  const { data } = await sb.from("market_snapshots").select("coin").order("volume_24h_usd", { ascending: false, nullsFirst: false });
  const coins = (data ?? []).map((d) => d.coin);
  const sp = await searchParams;
  const start = sp.coin && coins.includes(sp.coin) ? sp.coin : "BTC";
  return <LiquidityExplorer coins={coins} start={start} />;
}
