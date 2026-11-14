import { clientIp, json, rateLimit } from "@/lib/server/guard";
import { getStatus } from "@/lib/trade/oneclick";

export async function GET(req: Request) {
  if (!rateLimit(`status:${clientIp(req)}`, 60, 60_000)) return json({ error: "Too many requests" }, 429);
  const d = new URL(req.url).searchParams.get("d") ?? "";
  if (!/^[A-Za-z0-9:._-]{10,128}$/.test(d)) return json({ error: "Bad deposit address" }, 400);
  try { return json(await getStatus(d)); } catch (e) { return json({ error: e instanceof Error ? e.message : "Status failed" }, 502); }
}
