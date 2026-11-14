import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms | Quants" };

export default function Terms() {
  return (
    <LegalPage title="Terms and conditions" updated="14 November 2026">
      <p>By using Quants you agree to these terms. If you do not agree, do not use the service.</p>
      <h2>What Quants is</h2>
      <p>Quants is an information tool. It shows market data, automatically generated signals and alerts you set yourself. It is not a broker, exchange, bank or investment adviser, and nothing it shows is financial advice.</p>
      <h2>Your responsibility</h2>
      <p>You decide whether to trade. You are responsible for your trades, your wallets, your addresses and your keys. Quants never asks for seed phrases or private keys and never holds your funds.</p>
      <h2>Third-party services</h2>
      <p>Swaps are executed by NEAR Intents (1Click API) under its own terms. Leveraged trading happens on Hyperliquid in your own account under its terms. Alerts are delivered through Telegram. Quants does not control these services.</p>
      <h2>Availability</h2>
      <p>Quants is provided &quot;as is&quot;, without warranties. Data, signals and alerts can be late, wrong or missing. We may change or stop the service at any time.</p>
      <h2>Fair use</h2>
      <p>Do not abuse the service, try to access other users&apos; data, or overload it. We may limit or close accounts that do.</p>
      <h2>Liability</h2>
      <p>To the extent allowed by law, Quants is not liable for trading losses or any indirect loss arising from use of the service.</p>
    </LegalPage>
  );
}
