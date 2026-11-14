// Outbox sender: claims queued notifications, sends them through Telegram, retries with backoff.
// Each row has a unique dedupe_key, and a row is claimed (queued -> sending) before sending, so
// two overlapping runs can never send the same message twice.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendMessage, SEND_INTERVAL_MS, TelegramError } from "../telegram/api";
import type { TgMessage } from "../telegram/format";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function drainOutbox(db: SupabaseClient, budgetMs = 40_000) {
  const start = Date.now();
  let sent = 0, failed = 0, skipped = 0;
  const { data: rows } = await db
    .from("notifications")
    .select("id, user_id, payload, attempts")
    .eq("status", "queued")
    .lte("send_after", new Date().toISOString())
    .order("send_after")
    .limit(300);
  if (!rows?.length) return { sent, failed, skipped };

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profs } = await db.from("profiles").select("id, telegram_chat_id").in("id", userIds);
  const chat = new Map((profs ?? []).map((p) => [p.id, p.telegram_chat_id as number | null]));

  for (const r of rows) {
    if (Date.now() - start > budgetMs) break;
    const { data: claimed } = await db.from("notifications").update({ status: "sending" }).eq("id", r.id).eq("status", "queued").select("id");
    if (!claimed?.length) continue;
    const chatId = chat.get(r.user_id);
    if (!chatId) { await db.from("notifications").update({ status: "skipped" }).eq("id", r.id); skipped++; continue; }
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
        status: giveUp ? "failed" : "queued", attempts, send_after: new Date(Date.now() + wait).toISOString(),
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
