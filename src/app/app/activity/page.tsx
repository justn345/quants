// The user's own history: every message the agent sent (Telegram, phone, dashboard) and everything
// they did through Quants' routes (trade clicks, NEAR Intents quotes, deposit addresses), plus a weekly report.
import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { CoinIcon } from "@/components/ui";

const LABEL: Record<string, string> = {
  price: "Target hit", reminder: "Reminder", signal: "Signal", magnet: "Liquidity magnet", checkin: "Market check", system: "Notice",
  trade_click: "Opened Trade", quote: "NEAR Intents price check", deposit_address: "NEAR Intents deposit address", alert_created: "Alert created",
  telegram_linked: "Telegram connected", push_enabled: "Phone alerts on",
};
const DOT: Record<string, string> = { price: "bg-brand", reminder: "bg-brand", signal: "bg-night", magnet: "bg-coral", checkin: "bg-sage", trade_click: "bg-signal", quote: "bg-signal", deposit_address: "bg-signal" };

export default async function ActivityPage() {
  const { sb, user } = await currentUser();
  const uid = user!.id;
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [{ data: notes }, { data: acts }, { data: alerts }] = await Promise.all([
    sb.from("notifications").select("id,kind,title,body,status,created_at,sent_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(150),
    sb.from("activity").select("id,kind,coin,meta,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(150),
    sb.from("alerts").select("created_at,fired_at").eq("user_id", uid),
  ]);
  const week = <T extends { created_at: string }>(xs: T[] | null) => (xs ?? []).filter((x) => x.created_at >= weekAgo);
  const wn = week(notes), wa = week(acts);
  const report = [
    ["Alerts created", (alerts ?? []).filter((a) => a.created_at >= weekAgo).length],
    ["Targets hit", (alerts ?? []).filter((a) => a.fired_at && a.fired_at >= weekAgo).length],
    ["Signals received", wn.filter((n) => n.kind === "signal").length],
    ["Market checks", wn.filter((n) => n.kind === "checkin").length],
    ["Trade taps", wa.filter((a) => a.kind === "trade_click").length],
    ["NEAR Intents quotes", wa.filter((a) => a.kind === "quote" || a.kind === "deposit_address").length],
  ] as const;

  type Item = { id: string; kind: string; title: string; sub: string; at: string; coin?: string | null };
  const items: Item[] = [
    ...(notes ?? []).map((n) => ({ id: `n${n.id}`, kind: n.kind, title: n.title, sub: `${n.title.startsWith("Sample:") ? "Demo sample, nothing was sent" : n.status === "sent" ? "Delivered on Telegram" : n.status === "skipped" ? "Shown here only" : n.status === "queued" ? "Waiting (quiet hours)" : n.status}`, at: n.created_at })),
    ...(acts ?? []).map((a) => {
      const m = (a.meta ?? {}) as Record<string, string>;
      const sub = a.kind === "quote" || a.kind === "deposit_address" ? `${m.side ?? ""} ${m.amountIn ?? ""} ${m.from ?? ""} → ${m.amountOut ?? ""} ${m.to ?? ""}`.trim() : a.kind === "trade_click" ? (m.from === "alert" ? "From an alert" : "From the app") : "";
      return { id: `a${a.id}`, kind: a.kind, title: `${(a.meta as Record<string, unknown>)?.sample ? "Sample: " : ""}${LABEL[a.kind] ?? a.kind}${a.coin ? ` · ${a.coin}` : ""}`, sub, at: a.created_at, coin: a.coin };
    }),
  ].sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, 120);

  return (
    <div className="space-y-6">
      <div><p className="label">Activity</p><h1 className="display text-3xl font-black sm:text-4xl">Your history</h1>
        <p className="mt-1 font-medium text-ink-2">Everything the agent sent you and everything you did through Quants. Only you can see this.</p></div>

      <section className="hero-dark p-6">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="label text-mist">Weekly report</p><h2 className="display text-2xl font-black">Last 7 days</h2></div>
          <Link href="/app/alerts" className="btn h-10 bg-[#c9f26b] text-sm text-night">+ New alert</Link></div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {report.map(([l, v]) => <div key={l} className="rounded-2xl bg-[#163a29] p-4"><p className="display num text-3xl font-black text-signal">{v}</p><p className="mt-1 text-xs font-bold text-cream">{l}</p></div>)}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-extrabold">Timeline</h2>
        <ol className="mt-4 space-y-1">
          {items.map((it) => (
            <li key={it.id} className="flex items-start gap-3 rounded-2xl px-2 py-2.5 hover:bg-paper">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[it.kind] ?? "bg-mist"}`} />
              {it.coin ? <CoinIcon coin={it.coin} size={24} /> : null}
              <div className="min-w-0 flex-1"><p className="truncate font-bold">{it.title}</p>{it.sub && <p className="truncate text-xs font-semibold text-ink-2">{it.sub}</p>}</div>
              <time className="num shrink-0 text-xs font-semibold text-ink-2" dateTime={it.at}>{new Date(it.at).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
            </li>
          ))}
          {!items.length && <li className="py-4 text-sm font-medium text-ink-2">Nothing yet. Alerts, signals and trades you open will appear here.</li>}
        </ol>
      </section>
    </div>
  );
}
