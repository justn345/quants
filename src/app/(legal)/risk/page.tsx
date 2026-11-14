import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Risk disclaimer | Quants" };

export default function Risk() {
  return (
    <LegalPage title="Risk disclaimer" updated="14 November 2026">
      <p className="text-xl font-bold">Not financial advice. Do your own research. Signals are estimates and are not guaranteed.</p>
      <h2>Signals are estimates</h2>
      <p>Signals are calculated automatically from public market data (funding, open interest, order books and price trend). Liquidation levels are modelled estimates, not real positions. Signals are often wrong; the track record page shows the real hit rate.</p>
      <h2>Trading is risky</h2>
      <p>Crypto prices can move fast and you can lose all the money you trade. Leverage makes losses bigger and can liquidate your position. Only trade what you can afford to lose.</p>
      <h2>Quants never holds funds</h2>
      <p>Swaps go from your wallet to a NEAR Intents deposit address and settle to your own receiving address. Leveraged trades open in your own Hyperliquid account. Always check addresses and amounts before sending.</p>
      <h2>Alerts can be late</h2>
      <p>Prices are checked about once a minute and delivered through Telegram. Network problems or outages can delay or prevent alerts.</p>
    </LegalPage>
  );
}
