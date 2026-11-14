import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "About | Quants" };

export default function About() {
  return (
    <LegalPage title="About Quants" updated="14 November 2026">
      <p>Quants is an AI market agent that tells you when to act before the move passes. Pick your coins, set your own price levels, and get a clear alert on Telegram the moment something happens, with a one-tap Trade button.</p>
      <h2>How it works</h2>
      <p>Once a minute Quants reads public Hyperliquid market data for everyone and checks every user&apos;s own alerts with plain maths. Every 15 minutes it computes a basic signal per coin (Leaning long, Leaning short or No clear edge) from funding, open interest, order-book walls, trend and estimated liquidation clusters, and NEAR AI writes a two-line reason. Every signal is scored after 4h and 24h.</p>
      <h2>Built on NEAR</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li><b>NEAR Intents</b>: spot buys and sells settle cross-chain straight into your own wallet. Quants never holds funds.</li>
        <li><b>NEAR AI Cloud</b>: market summaries, alert parsing and Telegram answers run on NEAR AI.</li>
        <li><b>NEAR wallet login</b>: sign in by signing a message with your NEAR wallet. No transaction, no fees.</li>
      </ul>
    </LegalPage>
  );
}
