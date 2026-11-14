// Checks the server half of NEAR login: create a user for a NEAR account and open a session for it.
// Run: npx tsx scripts/near-session-test.ts   (cleans up after itself)
import { createClient } from "@supabase/supabase-js";

async function main() {
  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const user = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const email = `test_quants_check.near@near-wallet.quants.invalid`;
  const c = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { near_account: "test_quants_check.near" } });
  console.log("createUser:", c.error ? `ERROR ${c.error.message}` : "ok");
  const l = await admin.auth.admin.generateLink({ type: "magiclink", email });
  console.log("generateLink:", l.error ? `ERROR ${l.error.message}` : "ok");
  const v = await user.auth.verifyOtp({ token_hash: l.data?.properties?.hashed_token ?? "", type: "magiclink" });
  console.log("verifyOtp (session):", v.error ? `ERROR ${v.error.message}` : v.data.session ? "ok" : "no session");
  const id = c.data.user?.id ?? v.data.user?.id;
  if (id) await admin.auth.admin.deleteUser(id);
}
main();
