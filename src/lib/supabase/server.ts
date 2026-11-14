// Supabase clients. The service-role client is server-only and bypasses RLS: use it only in
// cron jobs, the Telegram webhook and admin code, never with data coming straight from a browser.
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Acts as the signed-in user (RLS applies). */
export async function userClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* read-only in server components */ }
      },
    },
  });
}

/** Server-only admin client (bypasses RLS). */
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function currentUser() {
  const sb = await userClient();
  const { data } = await sb.auth.getUser();
  return { sb, user: data.user };
}
