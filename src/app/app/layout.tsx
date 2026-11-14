import { redirect } from "next/navigation";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { isAdminUser } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { sb, user } = await currentUser();
  if (!user) redirect("/login");
  const { data: p } = await sb.from("profiles").select("display_name, is_demo, near_account, avatar_url, last_seen_at").eq("id", user.id).single();
  // "Last seen" for the admin's active-user count (at most once every 5 minutes).
  if (!p?.last_seen_at || Date.now() - new Date(p.last_seen_at).getTime() > 5 * 60_000) {
    await adminClient().from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user.id).then(() => undefined, () => undefined);
  }
  return (
    <AppShell name={p?.display_name || p?.near_account || "Trader"} demo={!!p?.is_demo} avatar={p?.avatar_url ?? null} admin={isAdminUser(user)}>
      {children}
    </AppShell>
  );
}
