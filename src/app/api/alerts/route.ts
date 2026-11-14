// Alerts API. Writes go through the user's own session, so Row Level Security guarantees
// users can only touch their own alerts. Every field is validated on the server.
import { z } from "zod";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { json, rateLimit } from "@/lib/server/guard";
import { alertRuleSchema, parseAlert } from "@/lib/alerts/parse";

async function universePrices() {
  const { data } = await adminClient().from("market_snapshots").select("coin,price");
  return Object.fromEntries((data ?? []).map((s) => [s.coin, +s.price])) as Record<string, number>;
}

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("parse"), text: z.string().min(1).max(280), timeZone: z.string().max(64).default("UTC") }),
  z.object({ action: z.literal("create"), rule: z.unknown(), sourceText: z.string().max(280).optional(), note: z.string().max(140).optional(), repeatMax: z.number().int().min(1).max(3).default(3), repeatGapMin: z.number().int().min(5).max(240).default(15) }),
  z.object({ action: z.literal("update"), id: z.string().uuid(), price: z.number().positive().finite().optional(), direction: z.enum(["above", "below"]).optional(), status: z.enum(["active", "paused"]).optional() }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  z.object({ action: z.literal("ack"), id: z.string().uuid() }),
]);

export async function POST(req: Request) {
  const { sb, user } = await currentUser();
  if (!user) return json({ error: "Sign in first" }, 401);
  if (!rateLimit(`alerts:${user.id}`, 120, 60_000)) return json({ error: "Slow down a little." }, 429);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const b = parsed.data;

  if (b.action === "parse") {
    if (!rateLimit(`parse:${user.id}`, 30, 60_000)) return json({ error: "Slow down a little." }, 429);
    const prices = await universePrices();
    const r = await parseAlert(b.text, prices, { timeZone: b.timeZone });
    if ("error" in r) return json({ error: r.error }, 422);
    if (r.source === "ai") await adminClient().rpc("bump_ai_usage", { p_kind: "parse" });
    return json({ rule: r.rule, source: r.source, now: prices[r.rule.coin] ?? null });
  }

  if (b.action === "create") {
    const prices = await universePrices();
    const rule = alertRuleSchema(new Set(Object.keys(prices))).safeParse(b.rule);
    if (!rule.success) return json({ error: "Invalid alert" }, 400);
    const r = rule.data;
    if (r.kind !== "reminder" && (r.price == null || r.direction == null)) return json({ error: "Alert needs a price and direction" }, 400);
    if (r.kind === "reminder" && !r.remindAt) return json({ error: "Reminder needs a time" }, 400);
    const { data, error } = await sb.from("alerts").insert({
      user_id: user.id, coin: r.coin, kind: r.kind, direction: r.direction, price: r.price, percent: r.percent,
      remind_at: r.remindAt, source_text: b.sourceText, note: b.note, repeat_max: b.repeatMax, repeat_gap_min: b.repeatGapMin,
    }).select("id").single();
    if (error) return json({ error: "Could not save alert" }, 400);
    await sb.from("watchlist").upsert({ user_id: user.id, coin: r.coin }, { onConflict: "user_id,coin", ignoreDuplicates: true });
    return json({ id: data.id });
  }

  if (b.action === "update") {
    const patch: Record<string, unknown> = {};
    if (b.price != null) patch.price = b.price;
    if (b.direction) patch.direction = b.direction;
    if (b.status) patch.status = b.status;
    if (b.price != null || b.direction) Object.assign(patch, { status: "active", acknowledged_at: null });
    const { error } = await sb.from("alerts").update(patch).eq("id", b.id).eq("user_id", user.id);
    if (error) return json({ error: "Could not update" }, 400);
    // Re-arm an edited alert (server-managed counters need the admin client; ownership checked above by RLS-filtered update).
    if (b.price != null || b.direction) await adminClient().from("alerts").update({ sent_count: 0, fired_at: null, last_sent_at: null }).eq("id", b.id).eq("user_id", user.id);
    return json({ ok: true });
  }

  if (b.action === "ack") {
    await sb.from("alerts").update({ acknowledged_at: new Date().toISOString(), status: "done" }).eq("id", b.id).eq("user_id", user.id);
    return json({ ok: true });
  }

  const { error } = await sb.from("alerts").delete().eq("id", b.id).eq("user_id", user.id);
  if (error) return json({ error: "Could not delete" }, 400);
  return json({ ok: true });
}
