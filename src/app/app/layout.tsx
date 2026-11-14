import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { sb, user } = await currentUser();
  if (!user) redirect("/login");
  const { data: p } = await sb.from("profiles").select("display_name, is_demo, near_account").eq("id", user.id).single();
  return <AppShell name={p?.display_name || p?.near_account || "Trader"} demo={!!p?.is_demo}>{children}</AppShell>;
}
