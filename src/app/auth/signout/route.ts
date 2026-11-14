import { userClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = await userClient();
  await sb.auth.signOut();
  return Response.redirect(new URL("/", req.url), 303);
}
