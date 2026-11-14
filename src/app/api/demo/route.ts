// "Try demo": a SANDBOX. Every visitor gets their own fresh anonymous account with sample data.
// Demo accounts: no real deposit addresses, no Telegram/phone messages (except the one-off "Connected"
// reply), max 10 alerts, deleted automatically after 48 hours. Sign-ups are limited per network.
import { createHmac } from "node:crypto";
import { adminClient, userClient } from "@/lib/supabase/server";
import { clientIp, json, rateLimit, siteUrl } from "@/lib/server/guard";

const DEMO_PER_IP_PER_HOUR = 6;

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`demo:${ip}`, DEMO_PER_IP_PER_HOUR, 3600_000)) return json({ error: "Too many demo accounts from this network. Try again in an hour." }, 429);
  const db = adminClient();
  // Database-backed limit across all servers; only a keyed hash of the IP is stored.
  const ipHash = createHmac("sha256", process.env.CRON_SECRET ?? "").update(`demo:${ip}`).digest("hex").slice(0, 32);
  const { count } = await db.from("demo_signups").select("ip_hash", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= DEMO_PER_IP_PER_HOUR) return json({ error: "Too many demo accounts from this network. Try again in an hour." }, 429);

  const sb = await userClient();
  const { data, error } = await sb.auth.signInAnonymously();
  if (error || !data.user) return json({ error: "Demo is unavailable right now." }, 503);
  const id = data.user.id;
  await db.from("demo_signups").insert({ ip_hash: ipHash });

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

  // Clearly labelled SAMPLE events so the Activity page shows how history looks.
  const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  const sample = { text: "Sample event (demo)", reply_markup: undefined };
  await db.from("notifications").insert([
    { user_id: id, kind: "signal", title: "Sample: SOL leaning long", body: "Example signal message", payload: sample, dedupe_key: `demo:${id}:1`, status: "skipped", created_at: ago(190) },
    { user_id: id, kind: "magnet", title: "Sample: BTC possible short (liquidity magnet)", body: "Example magnet message", payload: sample, dedupe_key: `demo:${id}:2`, status: "skipped", created_at: ago(140) },
    { user_id: id, kind: "price", title: "Sample: HYPE target hit", body: "Example target-hit message", payload: sample, dedupe_key: `demo:${id}:3`, status: "skipped", created_at: ago(95) },
    { user_id: id, kind: "checkin", title: "Sample: Market check, wait", body: "Example market check", payload: sample, dedupe_key: `demo:${id}:4`, status: "skipped", created_at: ago(60) },
  ]);
  await db.from("activity").insert([
    { user_id: id, kind: "trade_click", coin: "SOL", meta: { from: "alert", sample: true }, created_at: ago(185) },
    { user_id: id, kind: "quote", coin: "SOL", meta: { sample: true, side: "buy", amountIn: "50", from: "USDC/base", amountOut: "0.66", to: "SOL/sol" }, created_at: ago(184) },
  ]);
  return json({ ok: true, redirect: `${siteUrl()}/app` });
}
