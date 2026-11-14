// Telegram message layout (HTML parse mode). Every user-supplied or AI text is escaped.
import type { Signal } from "../market/signals";

export const DISCLAIMER = "Not financial advice. Do your own research. Signals are estimates and are not guaranteed.";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function fmtPx(p: number): string {
  if (!isFinite(p)) return "-";
  const d = p >= 1000 ? 0 : p >= 1 ? 2 : p >= 0.01 ? 4 : 6;
  return "$" + p.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export interface InlineButton { text: string; callback_data?: string; web_app?: { url: string }; url?: string }
export interface TgMessage { text: string; reply_markup?: { inline_keyboard: InlineButton[][] } }

function signalBlock(s: Pick<Signal, "label" | "keyLevel" | "entryLow" | "entryHigh" | "stop" | "target">, reason?: string) {
  const lines = [
    `<b>Signal:</b> ${esc(s.label)}`,
    `Key level ${fmtPx(s.keyLevel)}`,
    `Entry ${fmtPx(s.entryLow)} – ${fmtPx(s.entryHigh)}  ·  Stop ${fmtPx(s.stop)}  ·  Target ${fmtPx(s.target)}`,
  ];
  if (reason) lines.push("", esc(reason));
  return lines.join("\n");
}

function buttons(tradeUrl: string, ackData?: string): TgMessage["reply_markup"] {
  const row: InlineButton[] = [{ text: "Trade", web_app: { url: tradeUrl } }];
  if (ackData) row.push({ text: "Got it", callback_data: ackData });
  return { inline_keyboard: [row] };
}

/** A user's own price alert or reminder firing. */
export function priceAlertMessage(o: {
  coin: string; direction: "above" | "below" | null; level: number | null; price: number;
  note?: string | null; sendNumber: number; repeatMax: number; alertId: string; tradeUrl: string;
  signal?: (Pick<Signal, "label" | "keyLevel" | "entryLow" | "entryHigh" | "stop" | "target"> & { reason?: string }) | null;
}): TgMessage {
  const head = o.level != null && o.direction
    ? `<b>${esc(o.coin)} is ${o.direction} ${fmtPx(o.level)}</b>`
    : `<b>Reminder: ${esc(o.coin)}</b>`;
  const lines = [head, `Now ${fmtPx(o.price)}`];
  if (o.note) lines.push(`Your note: ${esc(o.note)}`);
  if (o.signal) lines.push("", signalBlock(o.signal, o.signal.reason));
  if (o.sendNumber > 1) lines.push("", `Reminder ${o.sendNumber} of ${o.repeatMax}. Tap "Got it" to stop.`);
  lines.push("", `<i>${DISCLAIMER}</i>`);
  return { text: lines.join("\n"), reply_markup: buttons(o.tradeUrl, `ack:${o.alertId}`) };
}

/** A signal change for a coin the user follows. */
export function signalMessage(s: Signal, reason: string, tradeUrl: string): TgMessage {
  const lines = [`<b>${esc(s.coin)} · ${esc(s.label)}</b>`, `Price ${fmtPx(s.price)}`, "", signalBlock(s, reason), "", `<i>${DISCLAIMER}</i>`];
  return { text: lines.join("\n"), reply_markup: buttons(tradeUrl) };
}

/** Price is close to an estimated liquidation cluster. */
export function magnetMessage(o: { coin: string; price: number; cluster: number; side: "long_liq" | "short_liq"; distancePct: number; tradeUrl: string }): TgMessage {
  const who = o.side === "short_liq" ? "short" : "long";
  const lines = [
    `<b>${esc(o.coin)} near a liquidation magnet</b>`,
    `Price ${fmtPx(o.price)} is ${Math.abs(o.distancePct).toFixed(1)}% from estimated ${who} liquidations near ${fmtPx(o.cluster)}.`,
    "Price often moves fast through these levels.",
    "", `<i>${DISCLAIMER}</i>`,
  ];
  return { text: lines.join("\n"), reply_markup: buttons(o.tradeUrl) };
}
