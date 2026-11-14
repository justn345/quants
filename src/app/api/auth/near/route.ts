// NEAR wallet sign-in. GET → nonce. POST → verify the signed message, then open a Supabase session
// for that NEAR account (one Quants account per NEAR account).
import { z } from "zod";
import { adminClient, userClient } from "@/lib/supabase/server";
import { clientIp, json, rateLimit } from "@/lib/server/guard";
import { issueNonce, verifyNearLogin, LOGIN_MESSAGE, LOGIN_RECIPIENT } from "@/lib/near/verify";

export async function GET() {
  return json({ nonce: issueNonce(), message: LOGIN_MESSAGE, recipient: LOGIN_RECIPIENT }, 200, { "Cache-Control": "no-store" });
}

const Body = z.object({ accountId: z.string().max(64), publicKey: z.string().max(80), signature: z.string().max(200), nonce: z.string().max(64) });

export async function POST(req: Request) {
  if (!rateLimit(`near:${clientIp(req)}`, 20, 600_000)) return json({ error: "Too many attempts. Wait a few minutes." }, 429);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Invalid sign-in" }, 400);
  const account = await verifyNearLogin(p.data);
  if (!account) return json({ error: "Could not verify your NEAR wallet signature." }, 401);

  const db = adminClient();
  // Internal placeholder email (never emailed) so Supabase Auth can hold one user per NEAR account.
  const email = `${account.replace(/[^a-z0-9._-]/g, "_")}@near-wallet.quants.invalid`;
  const created = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: { near_account: account, name: account } });
  if (created.error && !/already|registered|exists/i.test(created.error.message)) return json({ error: "Sign-in failed" }, 500);
  const link = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (!tokenHash) return json({ error: "Sign-in failed" }, 500);
  const sb = await userClient();
  const { data, error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error || !data.user) return json({ error: "Sign-in failed" }, 500);
  await db.from("profiles").update({ near_account: account, display_name: account.slice(0, 60) }).eq("id", data.user.id).is("near_account", null);
  return json({ ok: true, redirect: "/app" });
}
