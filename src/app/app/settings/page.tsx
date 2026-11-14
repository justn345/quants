import { currentUser } from "@/lib/supabase/server";
import { Settings } from "@/components/Settings";

export default async function SettingsPage() {
  const { sb, user } = await currentUser();
  const [{ data: profile }, { data: watch }, { data: addrs }, { data: snaps }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user!.id).single(),
    sb.from("watchlist").select("*").eq("user_id", user!.id).order("created_at"),
    sb.from("receive_addresses").select("*").eq("user_id", user!.id),
    sb.from("market_snapshots").select("coin").order("volume_24h_usd", { ascending: false }),
  ]);
  return <Settings profile={profile} watch={watch ?? []} addrs={addrs ?? []} allCoins={(snaps ?? []).map((s) => s.coin)} />;
}
