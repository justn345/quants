// Live smoke test: real Hyperliquid data -> signals -> reason (AI or template) -> alert parser -> 1Click coverage.
// Run: npx tsx scripts/signals-smoke.ts
import { FEATURED } from "../src/lib/market/coins";
import { fetchAssetCtxs, fetchAllMids, fetchCandles, fetchBook } from "../src/lib/market/hyperliquid";
import { computeSignal } from "../src/lib/market/signals";
import { writeReason } from "../src/lib/ai/reason";
import { parseSimple } from "../src/lib/alerts/parse";
import { fetchOneClickTokens, spotMarkets } from "../src/lib/trade/oneclick";

async function main() {
  const [ctxs, mids, tokens] = await Promise.all([fetchAssetCtxs(), fetchAllMids(), fetchOneClickTokens()]);
  const universe = Object.keys(ctxs);
  console.log(`Coins live on Hyperliquid: ${universe.length}; prices from allMids: ${Object.keys(mids).length}`);

  for (const coin of [...FEATURED, "XRP", "NEAR", "kPEPE"]) {
    const [c15, book] = await Promise.all([fetchCandles(coin, "15m", 24), fetchBook(coin)]);
    const s = computeSignal(coin, ctxs[coin], c15, book, null);
    const r = await writeReason(s);
    console.log(`${coin.padEnd(5)} $${s.price}  ${s.label.padEnd(13)} stop ${s.stop} target ${s.target}  [${r.source}] ${r.text}`);
  }

  const prices: Record<string, number> = {};
  for (const c of universe) prices[c] = ctxs[c].markPx;
  for (const t of ["HYPE at $25.07", "tell me if SOL drops 5% from now", "BTC above 100k", "xrp below 2", "pepe above 0.02", "dogecoin 10% up", "tell me when NEAR hits 5"])
    console.log(JSON.stringify(t), "->", JSON.stringify(parseSimple(t, prices)));

  const spot = spotMarkets(universe, tokens);
  console.log(`Spot-tradable via NEAR Intents: ${spot.size} of ${universe.length}: ${[...spot.keys()].join(" ")}`);
}
main();
