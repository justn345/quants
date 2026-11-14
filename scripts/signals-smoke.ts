// Live smoke test: real Hyperliquid data -> signals -> reason (AI or template) -> alert parser.
// Run: npx tsx scripts/signals-smoke.ts
import { COINS } from "../src/lib/market/coins";
import { fetchAssetCtxs, fetchCandles, fetchBook } from "../src/lib/market/hyperliquid";
import { computeSignal, scoreSignal } from "../src/lib/market/signals";
import { writeReason } from "../src/lib/ai/reason";
import { parseSimple } from "../src/lib/alerts/parse";

async function main() {
  const ctxs = await fetchAssetCtxs();
  const prices: Record<string, number> = {};
  for (const coin of COINS) {
    prices[coin] = ctxs[coin].markPx;
    const [c15, book] = await Promise.all([fetchCandles(coin, "15m", 24), fetchBook(coin)]);
    const s = computeSignal(coin, ctxs[coin], c15, book, null);
    const r = await writeReason(s);
    console.log(
      `${coin.padEnd(4)} $${s.price}  ${s.label.padEnd(13)} score ${s.score}  entry ${s.entryLow}-${s.entryHigh}` +
        ` stop ${s.stop} target ${s.target} key ${s.keyLevel}  [${r.source}] ${r.text}  (scorer: ${scoreSignal(s, c15.slice(-4))})`,
    );
  }
  for (const t of ["HYPE at $25.07", "tell me if SOL drops 5% from now", "BTC above 100k", "eth below 1800", "remind me about SOL tomorrow at 9am"])
    console.log(JSON.stringify(t), "->", JSON.stringify(parseSimple(t, prices as never)));
}
main();
