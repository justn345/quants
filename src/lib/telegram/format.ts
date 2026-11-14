// Telegram message layout (HTML parse mode). Every user-supplied or AI text is escaped.
// Message types are visually distinct: TARGET HIT / REMINDER (user's own levels), QUANTS SIGNAL (agent),
// LIQUIDITY MAGNET (agent), MARKET CHECK (agent's periodic "wait or act" summary).
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
    `Key level ${fmtPx(s.keyLevel)}`,
    `Entry ${fmtPx(s.entryLow)} – ${fmtPx(s.entryHigh)}`,
    `Stop ${fmtPx(s.stop)}  ·  Target ${fmtPx(s.target)}`,
  ];
  if (reason) lines.push("", esc(reason));
  return lines.join("\n");
}

function buttons(tradeUrl: string, ackData?: string, chartUrl?: string): TgMessage["reply_markup"] {
  const row: InlineButton[] = [{ text: "Trade", web_app: { url: tradeUrl } }];
  if (ackData) row.push({ text: "Got it", callback_data: ackData });
  const rows: InlineButton[][] = [row];
  if (chartUrl) rows.push([{ text: "Chart & liquidity map", web_app: { url: chartUrl } }]);
  return { inline_keyboard: rows };
}

/** TARGET HIT / REMINDER: only about the user's own level. No signal talk. */
export function priceAlertMessage(o: {
  coin: string; direction: "above" | "below" | null; level: number | null; price: number;
  note?: string | null; sendNumber: number; repeatMax: number; alertId: string; tradeUrl: string; chartUrl?: string;
}): TgMessage {
  const lines = o.level != null && o.direction
    ? [`<b>TARGET HIT · ${esc(o.coin)}</b>`, `Your alert: ${esc(o.coin)} ${o.direction} ${fmtPx(o.level)}`, `Price now: <b>${fmtPx(o.price)}</b>`]
    : [`<b>REMINDER · ${esc(o.coin)}</b>`, `You asked to be reminded about ${esc(o.coin)}.`, `Price now: <b>${fmtPx(o.price)}</b>`];
  if (o.note) lines.push(`Your note: ${esc(o.note)}`);
  lines.push("", "Tap Trade to buy spot via NEAR Intents or open the coin on Hyperliquid.");
  if (o.sendNumber > 1) lines.push(`Reminder ${o.sendNumber} of ${o.repeatMax}. Tap "Got it" to stop.`);
  lines.push("", `<i>${DISCLAIMER}</i>`);
  return { text: lines.join("\n"), reply_markup: buttons(o.tradeUrl, `ack:${o.alertId}`, o.chartUrl) };
}

/** QUANTS SIGNAL: the agent found a setup, or the edge disappeared (WAIT). */
export function signalMessage(s: Signal, reason: string, tradeUrl: string, chartUrl?: string): TgMessage {
  if (s.direction === "none") {
    const lines = [`<b>QUANTS SIGNAL · ${esc(s.coin)} · WAIT</b>`, `Price ${fmtPx(s.price)}`, "",
      "The edge is gone: no clear setup right now. Quants keeps watching and will tell you when one appears.", "", esc(reason), "", `<i>${DISCLAIMER}</i>`];
    return { text: lines.join("\n"), reply_markup: chartUrl ? { inline_keyboard: [[{ text: "Chart & liquidity map", web_app: { url: chartUrl } }]] } : undefined };
  }
  const lines = [`<b>QUANTS SIGNAL · ${esc(s.coin)} · ${esc(s.label.toUpperCase())}</b>`, `Price ${fmtPx(s.price)}`, "", signalBlock(s, reason), "", `<i>${DISCLAIMER}</i>`];
  return { text: lines.join("\n"), reply_markup: buttons(tradeUrl, undefined, chartUrl) };
}

/** LIQUIDITY MAGNET: price is close to an estimated liquidation stack. */
export function magnetMessage(o: { coin: string; price: number; cluster: number; side: "long_liq" | "short_liq"; distancePct: number; tradeUrl: string; chartUrl?: string }): TgMessage {
  const who = o.side === "short_liq" ? "short" : "long";
  // Stack above = short liquidations: price is often pulled UP to sweep them (long opportunity).
  // Stack below = long liquidations: price is often pulled DOWN to sweep them (short opportunity).
  const bias = o.side === "short_liq"
    ? `<b>Possible LONG</b> toward ${fmtPx(o.cluster)}: price is often pulled up to sweep stacked short liquidations, then can reverse.`
    : `<b>Possible SHORT</b> toward ${fmtPx(o.cluster)}: price is often pulled down to sweep stacked long liquidations, then can bounce.`;
  const lines = [
    `<b>LIQUIDITY MAGNET · ${esc(o.coin)}</b>`,
    `Price ${fmtPx(o.price)} is ${Math.abs(o.distancePct).toFixed(1)}% from a stack of estimated ${who} liquidations near <b>${fmtPx(o.cluster)}</b>.`,
    bias,
    "Use a stop. Sweeps are fast and can wick past the level.",
    "", `<i>${DISCLAIMER}</i>`,
  ];
  return { text: lines.join("\n"), reply_markup: buttons(o.tradeUrl, undefined, o.chartUrl) };
}

/** MARKET CHECK: periodic "wait or act" summary of the user's coins. */
export function checkinMessage(rows: { coin: string; price: number; label: string; direction: string }[], appUrl: string): TgMessage {
  const icon = (d: string) => (d === "long" ? "▲" : d === "short" ? "▼" : "•");
  const any = rows.some((r) => r.direction !== "none");
  const lines = [
    "<b>MARKET CHECK</b>",
    any ? "Some of your coins have a setup:" : "No clear setups on your coins. Best move right now: <b>wait</b>.",
    "",
    ...rows.map((r) => `${icon(r.direction)} <b>${esc(r.coin)}</b> ${fmtPx(r.price)} · ${r.direction === "none" ? "Wait" : esc(r.label)}`),
    "", "Turn check-ins off in Settings.", `<i>${DISCLAIMER}</i>`,
  ];
  return { text: lines.join("\n"), reply_markup: { inline_keyboard: [[{ text: "Open Quants AI", web_app: { url: appUrl } }]] } };
}

/** Main menu shown on /start and /menu. */
export function menuMarkup(appUrl: string): TgMessage["reply_markup"] {
  return { inline_keyboard: [
    [{ text: "My signals", callback_data: "menu:signals" }, { text: "My alerts", callback_data: "menu:alerts" }],
    [{ text: "Market check", callback_data: "menu:check" }, { text: "Watchlist", callback_data: "menu:watch" }],
    [{ text: "Open Quants AI", web_app: { url: appUrl } }],
  ] };
}
