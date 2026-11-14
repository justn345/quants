// Minimal Telegram Bot API client (server only; the token never reaches the browser).
import type { TgMessage } from "./format";

const API = "https://api.telegram.org";

export class TelegramError extends Error {
  constructor(message: string, public status: number, public retryAfterSec?: number) { super(message); }
}

export async function tg<T = unknown>(method: string, params: Record<string, unknown>, token = process.env.TELEGRAM_BOT_TOKEN): Promise<T> {
  if (!token) throw new TelegramError("TELEGRAM_BOT_TOKEN not set", 0);
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const j = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string; parameters?: { retry_after?: number } };
  // Never include the URL (it contains the token) in errors or logs.
  if (!j.ok) throw new TelegramError(j.description ?? `Telegram ${method} failed`, res.status, j.parameters?.retry_after);
  return j.result as T;
}

export function sendMessage(chatId: number, m: TgMessage) {
  return tg("sendMessage", {
    chat_id: chatId, text: m.text, parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(m.reply_markup ? { reply_markup: m.reply_markup } : {}),
  });
}

/** Telegram allows ~30 messages/second overall; we stay well under with a small delay between sends. */
export const SEND_INTERVAL_MS = 40;
