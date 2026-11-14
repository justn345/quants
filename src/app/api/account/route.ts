// Export my data (GET) and delete my account (DELETE). Both act only on the signed-in user.
import { adminClient, currentUser } from "@/lib/supabase/server";
import { json } from "@/lib/server/guard";

export async function GET() {
  const { sb, user } = await currentUser();
  if (!user) return json({ error: "Sign in first" }, 401);
  const [p, w, a, r, n, t] = await Promise.all([
    sb.from("profiles").select("*").eq("id", user.id).single(),
    sb.from("watchlist").select("*").eq("user_id", user.id),
    sb.from("alerts").select("*").eq("user_id", user.id),
    sb.from("receive_addresses").select("*").eq("user_id", user.id),
    sb.from("notifications").select("kind,title,body,status,created_at").eq("user_id", user.id),
    sb.from("trades").select("*").eq("user_id", user.id),
  ]);
  const body = JSON.stringify({ exported_at: new Date().toISOString(), profile: p.data, watchlist: w.data, alerts: a.data, receive_addresses: r.data, notifications: n.data, trades: t.data }, null, 2);
  return new Response(body, { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="quants-my-data.json"' } });
}

export async function DELETE() {
  const { sb, user } = await currentUser();
  if (!user) return json({ error: "Sign in first" }, 401);
  const { error } = await adminClient().auth.admin.deleteUser(user.id); // cascades to all user rows
  if (error) return json({ error: "Could not delete" }, 500);
  await sb.auth.signOut();
  return json({ ok: true });
}
