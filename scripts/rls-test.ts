// Tries to break Row Level Security with two real (anonymous) users on the live database.
// Run: npx tsx scripts/rls-test.ts   (uses only the PUBLIC anon key, like a browser would)
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
let failed = 0;
const ok = (c: boolean, n: string) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); if (!c) failed++; };
const mk = () => createClient(URL, ANON, { auth: { persistSession: false } });

async function main() {
  const a = mk(), b = mk(), anon = mk();
  const ua = (await a.auth.signInAnonymously()).data.user!, ub = (await b.auth.signInAnonymously()).data.user!;
  const ins = await a.from("alerts").insert({ user_id: ua.id, coin: "BTC", kind: "price", direction: "above", price: 123456 }).select("id").single();
  ok(!!ins.data?.id, "User A can create their own alert");
  const aid = ins.data!.id;

  ok(((await b.from("alerts").select("id").eq("id", aid)).data ?? []).length === 0, "User B cannot read A's alert");
  ok(((await b.from("alerts").update({ price: 1 }).eq("id", aid).select("id")).data ?? []).length === 0, "User B cannot edit A's alert");
  ok(((await b.from("alerts").delete().eq("id", aid).select("id")).data ?? []).length === 0, "User B cannot delete A's alert");
  ok(!!(await b.from("alerts").insert({ user_id: ua.id, coin: "BTC", kind: "price", direction: "above", price: 1 })).error, "User B cannot create an alert as A");
  ok(((await b.from("profiles").select("id").eq("id", ua.id)).data ?? []).length === 0, "User B cannot read A's profile");
  ok(!!(await a.from("profiles").update({ is_admin: true }).eq("id", ua.id)).error, "User A cannot make themselves admin");
  ok(!!(await a.from("profiles").update({ telegram_chat_id: 12345 }).eq("id", ua.id)).error, "User A cannot set a Telegram id directly");
  ok(!!(await a.from("alerts").update({ sent_count: 0 }).eq("id", aid)).error, "User A cannot change server-managed alert counters");
  ok(((await anon.from("alerts").select("id")).data ?? []).length === 0, "Logged-out visitor reads no alerts");
  ok(((await anon.from("telegram_link_codes").select("*")).data ?? []).length === 0, "Nobody can read Telegram link codes");
  ok(((await a.from("ai_usage").select("*")).data ?? []).length === 0, "Users cannot read AI usage");
  ok(!!(await a.from("signals").insert({ coin: "BTC", direction: "long", label: "x", score: 9, price: 1, reason: "x", reason_source: "ai" })).error, "Users cannot write fake signals");
  ok(!!(await a.rpc("bump_ask_usage", { p_user: ub.id })).error, "Users cannot call server-only functions");
  ok(((await a.from("signals").select("id").limit(1)).data ?? []).length > 0, "Shared signals are readable (expected)");

  await a.from("alerts").delete().eq("id", aid);
  console.log(failed ? `\n${failed} FAILED` : "\nAll RLS checks passed");
  process.exit(failed ? 1 : 0);
}
main();
