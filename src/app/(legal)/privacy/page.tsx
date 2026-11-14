import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy | Quants" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="14 November 2026">
      <h2>What we store</h2>
      <ul className="list-disc space-y-1 pl-6">
        <li>Your account id, and your NEAR account name if you sign in with a NEAR wallet.</li>
        <li>Your settings: display name, time zone, quiet hours, watchlist and notification switches.</li>
        <li>Your alerts and reminders, and the history of alerts sent to you.</li>
        <li>Your Telegram chat id, only if you connect Telegram.</li>
        <li>Receiving addresses you choose to save, and swap quotes you request while signed in.</li>
      </ul>
      <h2>Why</h2>
      <p>Only to run the service: to send you the alerts you asked for, at the levels you chose, to the place you chose.</p>
      <h2>What we never store</h2>
      <p>Seed phrases, private keys, passwords or card details. We do not sell data and we do not use ad trackers.</p>
      <h2>AI</h2>
      <p>Market summaries and plain-English alert parsing run on NEAR AI Cloud. Text you type into the alert box or send to the Telegram /ask command is sent there to be understood, without your name or contact details.</p>
      <h2>Who can see your data</h2>
      <p>Only you. Every table is protected by row-level security so each account can only read its own rows. Hosting is provided by Supabase and Vercel.</p>
      <h2>Delete it</h2>
      <p>Settings → &quot;Delete my account&quot; removes your account and all your alerts, settings and history immediately. &quot;Export my data&quot; downloads a copy first.</p>
    </LegalPage>
  );
}
