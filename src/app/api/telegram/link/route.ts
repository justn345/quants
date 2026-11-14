// Creates a one-time, 10-minute Telegram link for the signed-in user.
import { adminClient, currentUser } from "@/lib/supabase/server";
import { json, rateLimit } from "@/lib/server/guard";
import { deepLink, newLinkCode } from "@/lib/telegram/security";

export async function POST() {
  const { user } = await currentUser();
  if (!user) return json({ error: "Sign in first" }, 401);
  if (!rateLimit(`link:${user.id}`, 10, 3600_000)) return json({ error: "Too many tries. Wait a bit." }, 429);
  const { code, hash, expiresAt } = await newLinkCode();
  const db = adminClient();
  await db.from("telegram_link_codes").delete().eq("user_id", user.id).is("used_at", null);
  const { error } = await db.from("telegram_link_codes").insert({ code_hash: hash, user_id: user.id, expires_at: expiresAt.toISOString() });
  if (error) return json({ error: "Could not create link" }, 500);
  return json({ url: deepLink(process.env.TELEGRAM_BOT_USERNAME || "QuantsSignal_Bot", code), expiresAt });
}
