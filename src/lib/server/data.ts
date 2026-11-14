// Shared server-side reads for app pages (run as the signed-in user; RLS applies).
import "server-only";
import { currentUser } from "../supabase/server";

export type SignalRow = {
  id: string; coin: string; direction: "long" | "short" | "none"; label: string; score: number; price: number;
  key_level: number; entry_low: number; entry_high: number; stop: number; target: number;
  reason: string; reason_source: string; factors: Record<string, unknown>; created_at: string;
  outcome_4h: string | null; outcome_24h: string | null;
};

export async function loadDashboard() {
  const { sb, user } = await currentUser();
  const uid = user!.id;
  const [{ data: profile }, { data: watch }, { data: alerts }, { data: notes }] = await Promise.all([
    sb.from("profiles").select("*").eq("id", uid).single(),
    sb.from("watchlist").select("*").eq("user_id", uid).order("created_at"),
    sb.from("alerts").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
    sb.from("notifications").select("id,kind,title,body,status,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
  ]);
  const coins = (watch ?? []).map((w) => w.coin);
  const [{ data: snaps }, { data: signals }] = await Promise.all([
    sb.from("market_snapshots").select("*").in("coin", coins.length ? coins : ["BTC"]),
    sb.from("latest_signals").select("*").in("coin", coins.length ? coins : ["BTC"]),
  ]);
  return { uid, profile, watch: watch ?? [], alerts: alerts ?? [], notes: notes ?? [], snaps: snaps ?? [], signals: (signals ?? []) as SignalRow[] };
}
