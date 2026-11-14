// Writes the 2-line plain-English reason for a signal. One call per coin per 15-min cycle (capped per cycle).
import { nearChat } from "./nearai";
import { templateReason, type Signal } from "../market/signals";
import { fmtPrice, tidyPrices } from "../format";

const SYSTEM = `You write two short plain-English lines explaining a crypto market signal for a beginner.
Rules: max 2 sentences, max 220 characters total, no emojis, no hype, no promises, never say "guaranteed".
Copy prices EXACTLY as written in the facts (they are already formatted, e.g. "$1,820.68"). Never mention the same price twice.
If the signal is "No clear edge", do not give an entry, stop or target: say why it is a wait and name the key level(s) to watch.
Liquidation levels are estimates; say "estimated".`;

export async function writeReason(s: Signal, apiKey?: string): Promise<{ text: string; source: "ai" | "template" }> {
  const f = s.factors;
  const wait = s.direction === "none";
  const same = (a?: number | null, b?: number | null) => a != null && b != null && fmtPrice(a) === fmtPrice(b);
  // Drop liquidation levels that would just repeat the target/key level (avoids "target $3.01 ... cluster $3.01").
  const above = f.magnetAbove?.price ?? null, below = f.magnetBelow?.price ?? null;
  const facts: Record<string, string | number | null> = {
    coin: s.coin, signal: wait ? "No clear edge (wait)" : s.label, price: fmtPrice(s.price), key_level: fmtPrice(s.keyLevel),
    trend_4h_pct: +f.ret4hPct.toFixed(2), funding_hourly_pct: +(f.fundingHourly * 100).toFixed(4),
    oi_change_pct: f.oiChangePct == null ? null : +f.oiChangePct.toFixed(2),
    book_bid_ask_ratio: +f.bookImbalance.toFixed(2),
    est_short_liq_cluster_above: above != null && !same(above, s.target) && !same(above, s.keyLevel) ? fmtPrice(above) : null,
    est_long_liq_cluster_below: below != null && !same(below, s.target) && !same(below, s.keyLevel) ? fmtPrice(below) : null,
  };
  if (!wait) Object.assign(facts, { stop: fmtPrice(s.stop), target: fmtPrice(s.target) });
  try {
    const text = await nearChat(
      [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(facts) }],
      { apiKey, maxTokens: 120 },
    );
    const clean = tidyPrices(text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim(), s.price);
    if (clean.length < 20 || clean.length > 400 || /guarantee/i.test(clean)) throw new Error("bad output");
    return { text: clean.slice(0, 300), source: "ai" };
  } catch {
    return { text: templateReason(s), source: "template" };
  }
}
