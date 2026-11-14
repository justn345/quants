// DRY quote test (no deposit address, no funds move): $20 of USDC on Base -> BTC, and -> SOL.
// Public, well-known addresses are used only as placeholders for the price check.
// Run: npx tsx scripts/quote-test.ts
import { fetchOneClickTokens, getQuote, isValidAddress } from "../src/lib/trade/oneclick";

async function main() {
  const tokens = await fetchOneClickTokens();
  const find = (sym: string, chain: string) => tokens.find((t) => t.symbol === sym && t.blockchain === chain)!;
  const usdcBase = find("USDC", "base");
  const evm = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  const cases = [
    { out: find("BTC", "btc"), recipient: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" },
    { out: find("SOL", "sol"), recipient: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" },
  ];
  console.log("Address checks:", isValidAddress("btc", cases[0].recipient), isValidAddress("sol", cases[1].recipient),
    isValidAddress("base", evm), "bad:", isValidAddress("btc", evm), isValidAddress("eth", "0x123"));
  for (const c of cases) {
    try {
      const { quote } = await getQuote({
        originAsset: usdcBase.assetId, destinationAsset: c.out.assetId, amount: String(20 * 10 ** usdcBase.decimals),
        recipient: c.recipient, refundTo: evm, dry: true,
      });
      console.log(`DRY 20 USDC(base) -> ${c.out.symbol}: get ${quote.amountOutFormatted} ${c.out.symbol} (~$${quote.amountOutUsd}), ~${quote.timeEstimate}s, deposit address in dry mode: ${quote.depositAddress ?? "none"}`);
    } catch (e) {
      console.log(`DRY quote ${c.out.symbol} failed:`, e instanceof Error ? e.message : e);
    }
  }
}
main();
