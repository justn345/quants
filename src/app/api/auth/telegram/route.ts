// Sign in from inside Telegram (Mini App). Telegram signs `initData` with our bot token; we verify the
// HMAC exactly as Telegram documents, then open a session for the Quants account linked to that
// Telegram user. Google can't be used here because Google blocks sign-in inside in-app browsers.
import { createHmac, timingSafeEqual } from "node:crypto";
import { adminClient, userClient } from "@/lib/supabase/server";
import { clientIp, json, rateLimit } from "@/lib/server/guard";

function verifyInitData(initData: string, botToken: string): { id: number } | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete("hash");
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(check).digest("hex");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(hash))) return null;
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > 24 * 3600) return null; // older than a day: reject
  try {
    const u = JSON.parse(params.get("user") ?? "{}");
    return typeof u.id === "number" ? { id: u.id } : null;
  } catch { return null; }
}

export async function POST(req: Request) {
  if (!rateLimit(`tglogin:${clientIp(req)}`, 30, 600_000)) return json({ error: "Too many attempts. Wait a few minutes." }, 429);
  const body = await req.json().catch(() => null) as { initData?: string } | null;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !body?.initData || body.initData.length > 4096) return json({ error: "Invalid request" }, 400);
  const tg = verifyInitData(body.initData, token);
  if (!tg) return json({ error: "Could not verify Telegram." }, 401);

  const db = adminClient();
  const { data: prof } = await db.from("profiles").select("id").eq("telegram_chat_id", tg.id).maybeSingle();
  if (!prof) return json({ error: "This Telegram isn't linked yet. Open Quants in your browser, sign in, and tap \"Connect Telegram\" once.", notLinked: true }, 404);
  const { data: au } = await db.auth.admin.getUserById(prof.id);
  const email = au.user?.email;
  if (!email) return json({ error: "This is a demo account. Sign in with Google or a NEAR wallet in your browser first.", notLinked: true }, 409);
  const link = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (!tokenHash) return json({ error: "Sign-in failed" }, 500);
  const sb = await userClient();
  const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) return json({ error: "Sign-in failed" }, 500);
  return json({ ok: true, redirect: "/app" });
}
