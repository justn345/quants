// Private admin dashboard. Hidden (404) for everyone except the Google account in ADMIN_EMAILS.
// Shows only aggregate usage numbers: no private keys, no alert contents, no personal details.
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/server/admin";
import { Logo } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin | Quants", robots: { index: false, follow: false } };

type Stats = Record<string, number> & { signups_by_day: { day: string; n: number }[] };

export default async function Admin() {
  const { user } = await currentUser();
  if (!isAdminUser(user)) notFound();
  const db = adminClient();
  const [{ data: stats }, { data: usage }, { data: recent }, { data: kinds }] = await Promise.all([
    db.rpc("admin_stats"),
    db.from("ai_usage").select("*").order("day", { ascending: false }).limit(30),
    db.from("profiles").select("id,is_demo,near_account,telegram_chat_id,created_at,last_seen_at").order("created_at", { ascending: false }).limit(25),
    db.from("notifications").select("kind,status").gte("created_at", new Date(Date.now() - 7 * 86400_000).toISOString()).limit(20000),
  ]);
  const s = (stats ?? {}) as Stats;
  const byKind = new Map<string, number>();
  for (const k of kinds ?? []) byKind.set(k.kind, (byKind.get(k.kind) ?? 0) + 1);
  const maxDay = Math.max(1, ...(s.signups_by_day ?? []).map((d) => d.n));
  const tile = (l: string, v: number | undefined, dark = false) => (
    <div key={l} className={dark ? "hero-dark p-5" : "card p-5"}><p className={`label ${dark ? "text-mist" : ""}`}>{l}</p><p className="display num mt-2 text-4xl font-black">{v ?? 0}</p></div>
  );
  const ago = (iso: string | null) => { if (!iso) return "never"; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; };

  return (
    <main className="canvas min-h-dvh px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex items-center justify-between"><Link href="/app"><Logo /></Link><span className="chip bg-night text-signal">Admin · private</span></header>
        <h1 className="display text-4xl font-black">Usage dashboard</h1>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tile("Active now (15 min)", s.active_15m, true)}
          {tile("Active last 24h", s.active_24h)}
          {tile("Total users", s.users_total)}
          {tile("Signed-in users (not demo)", s.users_real)}
          {tile("Demo accounts", s.users_demo)}
          {tile("Sign-ups today", s.signups_today)}
          {tile("Sign-ups 7 days", s.signups_7d)}
          {tile("Telegram connected", s.telegram_linked)}
          {tile("Phone push devices", s.push_devices)}
          {tile("Active alerts", s.alerts_active)}
          {tile("Alerts fired 24h", s.alerts_fired_24h)}
          {tile("Messages sent 24h", s.notifications_sent_24h)}
          {tile("Signals logged", s.signals_total)}
          {tile("Trade clicks 7d", s.trade_clicks_7d)}
          {tile("NEAR Intents quotes 7d", s.quotes_7d)}
          {tile("Deposit addresses 7d", s.deposit_addresses_7d)}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-lg font-extrabold">Sign-ups, last 14 days</h2>
            <div className="mt-4 flex h-40 items-stretch gap-1.5">
              {(s.signups_by_day ?? []).map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.n}`}>
                  <span className="num text-[10px] font-bold">{d.n || ""}</span>
                  <span className="w-full rounded-full bg-brand" style={{ height: `${Math.max(4, (d.n / maxDay) * 100)}%` }} />
                  <span className="text-[9px] font-bold text-ink-2">{d.day.slice(8)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="text-lg font-extrabold">Messages by type, last 7 days</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {["price", "reminder", "signal", "magnet", "checkin"].map((k) => (
                <li key={k} className="flex justify-between border-b border-line pb-2"><span className="font-bold capitalize">{k === "price" ? "Target hit" : k === "checkin" ? "Market check" : k}</span><span className="num font-extrabold">{byKind.get(k) ?? 0}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card overflow-x-auto p-5">
            <h2 className="text-lg font-extrabold">Latest accounts (anonymised)</h2>
            <table className="num mt-3 w-full text-left text-sm">
              <thead><tr className="label"><th className="py-2">Account</th><th>Type</th><th>Telegram</th><th>Joined</th><th>Last seen</th></tr></thead>
              <tbody className="divide-y divide-line">{(recent ?? []).map((r) => (
                <tr key={r.id}><td className="py-2 font-semibold">{r.id.slice(0, 8)}</td><td>{r.is_demo ? "Demo" : r.near_account ? "NEAR wallet" : "Google"}</td><td>{r.telegram_chat_id ? "Yes" : "–"}</td><td>{ago(r.created_at)}</td><td>{ago(r.last_seen_at)}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="card overflow-x-auto p-5">
            <h2 className="text-lg font-extrabold">NEAR AI calls per day</h2>
            <table className="num mt-3 w-full text-left text-sm">
              <thead><tr className="label"><th className="py-2">Day</th><th>Kind</th><th>Calls</th><th>Failures</th></tr></thead>
              <tbody className="divide-y divide-line">{(usage ?? []).map((u) => <tr key={`${u.day}${u.kind}`}><td className="py-2 font-semibold">{u.day}</td><td>{u.kind}</td><td className="font-bold">{u.calls}</td><td>{u.failures}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
