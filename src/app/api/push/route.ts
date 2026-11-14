// Save (POST) or remove (DELETE) this device's push subscription for the signed-in user.
import { z } from "zod";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { json, rateLimit } from "@/lib/server/guard";

const Sub = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function POST(req: Request) {
  const { user } = await currentUser();
  if (!user) return json({ error: "Sign in first" }, 401);
  if (!rateLimit(`push:${user.id}`, 20, 3600_000)) return json({ error: "Too many tries" }, 429);
  const p = Sub.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Invalid subscription" }, 400);
  const db = adminClient();
  const { count } = await db.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= 10) await db.from("push_subscriptions").delete().eq("user_id", user.id).order("created_at").limit(1);
  const { error } = await db.from("push_subscriptions").upsert({ user_id: user.id, endpoint: p.data.endpoint, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth }, { onConflict: "endpoint" });
  if (error) return json({ error: "Could not save" }, 500);
  await db.from("activity").insert({ user_id: user.id, kind: "push_enabled" });
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user } = await currentUser();
  if (!user) return json({ error: "Sign in first" }, 401);
  const endpoint = new URL(req.url).searchParams.get("endpoint") ?? "";
  await adminClient().from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  return json({ ok: true });
}
