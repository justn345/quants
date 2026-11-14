import { userClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = await userClient();
  await sb.auth.signOut();
  const form = await req.formData().catch(() => null);
  return Response.redirect(new URL(form?.get("switch") ? "/login" : "/", req.url), 303);
}
