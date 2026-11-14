// Writes the 2-line plain-English reason for a signal. One call per coin per 15-min cycle (max 480/day).
import { nearChat } from "./nearai";
import { templateReason, type Signal } from "../market/signals";

const SYSTEM = `You write two short plain-English lines explaining a crypto market signal for a beginner.
Rules: max 2 sentences, max 220 characters total, no emojis, no hype, no promises, never say "guaranteed".
Only use the numbers given and write every price with a $ sign. Liquidation levels are estimates; say "estimated".`;

export async function writeReason(s: Signal, apiKey?: string): Promise<{ text: string; source: "ai" | "template" }> {
  const f = s.factors;
  const facts = {
    coin: s.coin, signal: s.label, price: s.price, key_level: s.keyLevel, stop: s.stop, target: s.target,
    trend_4h_pct: +f.ret4hPct.toFixed(2), funding_hourly_pct: +(f.fundingHourly * 100).toFixed(4),
    oi_change_pct: f.oiChangePct == null ? null : +f.oiChangePct.toFixed(2),
    book_bid_ask_ratio: +f.bookImbalance.toFixed(2),
    est_short_liq_cluster: f.magnetAbove?.price ?? null, est_long_liq_cluster: f.magnetBelow?.price ?? null,
  };
  try {
    const text = await nearChat(
      [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(facts) }],
      { apiKey, maxTokens: 120 },
    );
    const clean = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length < 20 || clean.length > 400 || /guarantee/i.test(clean)) throw new Error("bad output");
    return { text: clean.slice(0, 300), source: "ai" };
  } catch {
    return { text: templateReason(s), source: "template" };
  }
}
