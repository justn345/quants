import { loadDashboard } from "@/lib/server/data";
import { QuickAlert } from "@/components/QuickAlert";
import { AlertList } from "@/components/AlertList";

export default async function AlertsPage() {
  const d = await loadDashboard();
  return (
    <div className="space-y-6">
      <div><p className="label">Alerts</p><h1 className="display text-3xl font-black sm:text-4xl">Your alerts & reminders</h1>
        <p className="mt-2 font-medium text-ink-2">Any coin, any price, above or below. Each alert is yours alone. It repeats up to 3 times until you tap Got it.</p></div>
      <QuickAlert />
      <AlertList alerts={d.alerts} />
    </div>
  );
}
