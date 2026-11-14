// Admin check. The admin email list lives ONLY in the ADMIN_EMAILS env var (never in code).
// Requires a Google-verified email: anonymous demo users have no email, and NEAR-wallet users have an
// internal placeholder address, so neither can ever match.
import "server-only";
import type { User } from "@supabase/supabase-js";

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user?.email || !user.email_confirmed_at) return false;
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider as string];
  if (!providers.includes("google")) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(user.email.toLowerCase());
}
