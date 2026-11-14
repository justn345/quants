// "Try demo": every visitor gets their OWN fresh anonymous account, pre-filled with sample data,
// so judges never see or change each other's alerts. Rate-limited per IP.
import { adminClient, userClient } from "@/lib/supabase/server";
import { clientIp, json, rateLimit, siteUrl } from "@/lib/server/guard";

export async function POST(req: Request) {
  if (!rateLimit(`demo:${clientIp(req)}`, 8, 3600_000)) return json({ error: "Too many demo accounts from this network. Try again later." }, 429);
  const sb = await userClient();
  const { data, error } = await sb.auth.signInAnonymously();
  if (error || !data.user) return json({ error: "Demo is unavailable right now." }, 503);
  const id = data.user.id;
  const db = adminClient();
  const { data: snaps } = await db.from("market_snapshots").select("coin,price").in("coin", ["BTC", "ETH", "SOL", "HYPE", "XRP", "NEAR"]);
  const px = Object.fromEntries((snaps ?? []).map((s) => [s.coin, +s.price]));
  const r = (x: number) => +x.toPrecision(5);

  await db.from("profiles").update({ display_name: "Demo trader", is_demo: true, onboarded: true, quiet_start: "23:00", quiet_end: "07:00" }).eq("id", id);
  await db.from("watchlist").upsert([{ user_id: id, coin: "XRP" }, { user_id: id, coin: "NEAR" }], { onConflict: "user_id,coin" });
  const alerts = [
    px.BTC && { coin: "BTC", kind: "price", direction: "above", price: r(px.BTC * 1.02), source_text: "BTC above +2%" },
    px.SOL && { coin: "SOL", kind: "percent", direction: "below", price: r(px.SOL * 0.95), percent: -5, source_text: "tell me if SOL drops 5% from now" },
    px.HYPE && { coin: "HYPE", kind: "price", direction: "below", price: r(px.HYPE * 0.97), source_text: "HYPE below -3%" },
    px.NEAR && { coin: "NEAR", kind: "price", direction: "above", price: r(px.NEAR * 1.05), source_text: "NEAR above +5%" },
    px.ETH && { coin: "ETH", kind: "reminder", direction: "below", price: r(px.ETH * 1.1), remind_at: new Date(Date.now() + 18 * 3600_000).toISOString(), source_text: "remind me tomorrow if ETH is below this level" },
  ].filter(Boolean).map((a) => ({ ...(a as object), user_id: id }));
  await db.from("alerts").insert(alerts);
  return json({ ok: true, redirect: `${siteUrl()}/app` });
}
