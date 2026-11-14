// Outbox sender: claims queued notifications and delivers each one to Telegram AND to the user's
// phones/desktops (Web Push). Each row has a unique dedupe_key and is claimed (queued -> sending)
// before sending, so two overlapping runs can never send the same message twice.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { sendMessage, SEND_INTERVAL_MS, TelegramError } from "../telegram/api";
import type { TgMessage } from "../telegram/format";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let vapidReady = false;
function vapid() {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://quants-vert.vercel.app", pub, priv);
  return (vapidReady = true);
}

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };

async function pushTo(db: SupabaseClient, subs: Sub[], title: string, body: string, url: string, tag: string): Promise<boolean> {
  if (!subs.length || !vapid()) return false;
  let ok = false;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url, tag }), { TTL: 3600, urgency: "high" });
      ok = true;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id); // device unsubscribed
    }
  }));
  return ok;
}

export async function drainOutbox(db: SupabaseClient, budgetMs = 40_000) {
  const start = Date.now();
  let sent = 0, failed = 0, skipped = 0;
  const { data: rows } = await db
    .from("notifications")
    .select("id, user_id, kind, title, body, payload, attempts, pushed_at")
    .eq("status", "queued")
    .lte("send_after", new Date().toISOString())
    .order("send_after")
    .limit(300);
  if (!rows?.length) return { sent, failed, skipped };

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const [{ data: profs }, { data: subs }] = await Promise.all([
    db.from("profiles").select("id, telegram_chat_id").in("id", userIds),
    db.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth").in("user_id", userIds),
  ]);
  const chat = new Map((profs ?? []).map((p) => [p.id, p.telegram_chat_id as number | null]));
  const subsBy = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) subsBy.set(s.user_id, [...(subsBy.get(s.user_id) ?? []), s]);

  for (const r of rows) {
    if (Date.now() - start > budgetMs) break;
    const { data: claimed } = await db.from("notifications").update({ status: "sending" }).eq("id", r.id).eq("status", "queued").select("id");
    if (!claimed?.length) continue;

    // Phone/desktop push (once per notification, even if Telegram is retried later).
    let pushed = !!r.pushed_at;
    if (!pushed) {
      const coinMatch = String(r.title).match(/^([A-Za-z0-9]{1,15})\b/);
      const url = r.kind === "checkin" || !coinMatch ? "/app" : `/app/signals?coin=${encodeURIComponent(coinMatch[1])}`;
      pushed = await pushTo(db, subsBy.get(r.user_id) ?? [], `Quants · ${r.title}`, r.body, url, `${r.kind}:${r.id}`);
      if (pushed) await db.from("notifications").update({ pushed_at: new Date().toISOString() }).eq("id", r.id);
    }

    const chatId = chat.get(r.user_id);
    if (!chatId) {
      await db.from("notifications").update({ status: pushed ? "sent" : "skipped", sent_at: pushed ? new Date().toISOString() : null }).eq("id", r.id);
      if (pushed) sent++; else skipped++;
      continue;
    }
    try {
      await sendMessage(chatId, r.payload as TgMessage);
      await db.from("notifications").update({ status: "sent", sent_at: new Date().toISOString(), attempts: r.attempts + 1 }).eq("id", r.id);
      sent++;
    } catch (e) {
      const te = e instanceof TelegramError ? e : null;
      const attempts = r.attempts + 1;
      const blocked = te?.status === 403; // user blocked the bot
      const giveUp = blocked || attempts >= 5;
      const wait = te?.retryAfterSec ? te.retryAfterSec * 1000 : 60_000 * 2 ** attempts;
      await db.from("notifications").update({
        status: giveUp ? (pushed ? "sent" : "failed") : "queued", attempts, send_after: new Date(Date.now() + wait).toISOString(),
      }).eq("id", r.id);
      if (blocked) await db.from("profiles").update({ telegram_chat_id: null }).eq("telegram_chat_id", chatId);
      failed++;
    }
    await sleep(SEND_INTERVAL_MS);
  }
  return { sent, failed, skipped };
}

/** Insert a notification; ignored if the same dedupe_key already exists (idempotent). */
export async function enqueue(db: SupabaseClient, n: {
  user_id: string; kind: string; title: string; body: string; payload: TgMessage; dedupe_key: string;
  alert_id?: string | null; signal_id?: string | null; send_after?: string;
}) {
  await db.from("notifications").upsert(n, { onConflict: "dedupe_key", ignoreDuplicates: true });
}
