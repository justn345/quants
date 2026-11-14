"use client";
// Settings writes go straight to Supabase as the signed-in user; Row Level Security limits them to their own rows.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { CoinIcon } from "./ui";
import { TelegramConnect } from "./TelegramConnect";
import { ProfileCard } from "./ProfileCard";
import { PushToggle } from "./PushToggle";

type P = Record<string, unknown> & { id: string };
type W = { coin: string; notify_signals: boolean; notify_magnets: boolean; notify_price: boolean };
type Ad = { id: string; chain: string; address: string; label: string | null };

export function Settings({ profile, watch, addrs, allCoins }: { profile: P | null; watch: W[]; addrs: Ad[]; allCoins: string[] }) {
  const sb = browserClient();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({
    display_name: (profile?.display_name as string) ?? "", time_zone: (profile?.time_zone as string) ?? "UTC",
    quiet_start: ((profile?.quiet_start as string) ?? "").slice(0, 5), quiet_end: ((profile?.quiet_end as string) ?? "").slice(0, 5),
    max_alerts_per_day: (profile?.max_alerts_per_day as number) ?? 20, repeat_gap_min: (profile?.repeat_gap_min as number) ?? 15,
  });
  const [add, setAdd] = useState("");
  const [chain, setChain] = useState("base");
  const [addr, setAddr] = useState("");
  const done = (e: { error: unknown } | null, ok = "Saved.") => { setMsg(e?.error ? "Could not save. Check the values." : ok); router.refresh(); };
  const zones = typeof Intl !== "undefined" && "supportedValuesOf" in Intl ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone") : [];
  if (!zones.includes("UTC")) zones.unshift("UTC");
  const uid = profile?.id;

  return (
    <div className="space-y-6">
      <div><p className="label">Profile & settings</p><h1 className="display text-3xl font-black sm:text-4xl">Settings</h1></div>
      {msg && <p role="status" className="chip bg-lime px-4 py-2 text-sm text-night">{msg}</p>}

      <ProfileCard uid={String(profile?.id)} name={(profile?.display_name as string) ?? ""} bio={(profile?.bio as string) ?? ""} avatar={(profile?.avatar_url as string) ?? null} checkins={profile?.notify_checkins !== false} demo={!!profile?.is_demo} />

      <PushToggle />

      <section className="card grid gap-4 p-6 md:grid-cols-2">
        <h2 className="text-lg font-extrabold md:col-span-2">Notifications</h2>
        <label className="space-y-1"><span className="label">Time zone</span><select className="input" value={f.time_zone} onChange={(e) => setF({ ...f, time_zone: e.target.value })}>{zones.map((z) => <option key={z}>{z}</option>)}</select></label>
        <label className="space-y-1"><span className="label">Quiet hours start</span><input type="time" className="input" value={f.quiet_start} onChange={(e) => setF({ ...f, quiet_start: e.target.value })} /></label>
        <label className="space-y-1"><span className="label">Quiet hours end</span><input type="time" className="input" value={f.quiet_end} onChange={(e) => setF({ ...f, quiet_end: e.target.value })} /></label>
        <label className="space-y-1"><span className="label">Max signal alerts per day</span><input type="number" min={1} max={200} className="input num" value={f.max_alerts_per_day} onChange={(e) => setF({ ...f, max_alerts_per_day: +e.target.value })} /></label>
        <label className="space-y-1"><span className="label">Repeat gap (minutes)</span><input type="number" min={5} max={240} className="input num" value={f.repeat_gap_min} onChange={(e) => setF({ ...f, repeat_gap_min: +e.target.value })} /></label>
        <p className="text-sm font-medium text-ink-2 md:col-span-2">Your own price alerts are never dropped: during quiet hours they wait until quiet hours end.</p>
        <div className="md:col-span-2"><button className="btn btn-dark" onClick={async () => {
          const { display_name: _dn, ...rest } = f; void _dn;
          const r = await sb.from("profiles").update({ ...rest, quiet_start: f.quiet_start || null, quiet_end: f.quiet_end || null }).eq("id", uid);
          done(r);
        }}>Save settings</button></div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Watchlist</h2><TelegramConnect connected={!!profile?.telegram_chat_id} /></div>
        <p className="mt-1 text-sm font-medium text-ink-2">You only get alerts for coins listed here, and only the types you switch on.</p>
        <form className="mt-4 flex gap-2" onSubmit={async (e) => { e.preventDefault(); const c = allCoins.find((x) => x.toUpperCase() === add.trim().toUpperCase()); if (!c) return setMsg("Unknown coin. Use the Hyperliquid ticker, e.g. XRP or kPEPE."); done(await sb.from("watchlist").upsert({ user_id: uid, coin: c }, { onConflict: "user_id,coin" }), `${c} added.`); setAdd(""); }}>
          <input className="input" list="coins" placeholder="Add a coin (any of 170+)" value={add} onChange={(e) => setAdd(e.target.value)} />
          <datalist id="coins">{allCoins.map((c) => <option key={c} value={c} />)}</datalist>
          <button className="btn btn-primary shrink-0">Add</button>
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead><tr className="label"><th className="py-2">Coin</th><th>Signal changes</th><th>Liquidation magnets</th><th>My price alerts</th><th /></tr></thead>
            <tbody className="divide-y divide-line">{watch.map((w) => (
              <tr key={w.coin}>
                <td className="py-3"><span className="flex items-center gap-2 font-bold"><CoinIcon coin={w.coin} size={24} />{w.coin}</span></td>
                {(["notify_signals", "notify_magnets", "notify_price"] as const).map((k) => (
                  <td key={k}><input type="checkbox" className="h-5 w-5 accent-[#007D10]" aria-label={`${w.coin} ${k}`} defaultChecked={w[k]} onChange={async (e) => done(await sb.from("watchlist").update({ [k]: e.target.checked }).eq("user_id", uid).eq("coin", w.coin))} /></td>
                ))}
                <td><button className="text-sm font-bold text-coral" onClick={async () => done(await sb.from("watchlist").delete().eq("user_id", uid).eq("coin", w.coin), `${w.coin} removed.`)}>Remove</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-extrabold">Receiving addresses</h2>
        <p className="mt-1 text-sm font-medium text-ink-2">Your own wallets, used to pre-fill the trade page. Quants never asks for seed phrases or private keys.</p>
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); done(await sb.from("receive_addresses").insert({ user_id: uid, chain, address: addr.trim() }), "Address saved."); setAddr(""); }}>
          <select className="input w-32" value={chain} onChange={(e) => setChain(e.target.value)} aria-label="Chain">{["base", "eth", "arb", "sol", "btc", "near", "bsc", "tron"].map((c) => <option key={c}>{c}</option>)}</select>
          <input className="input flex-1" placeholder="Address" value={addr} onChange={(e) => setAddr(e.target.value)} minLength={10} maxLength={128} />
          <button className="btn btn-dark">Save</button>
        </form>
        <ul className="mt-3 divide-y divide-line">{addrs.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span className="num truncate font-semibold"><b className="uppercase">{a.chain}</b> · {a.address}</span><button className="font-bold text-coral" onClick={async () => done(await sb.from("receive_addresses").delete().eq("id", a.id))}>Remove</button></li>
        ))}</ul>
        {typeof profile?.near_account === "string" && <p className="mt-3 text-sm font-semibold">Connected NEAR wallet: {profile.near_account}</p>}
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div><h2 className="text-lg font-extrabold">Your data</h2><p className="text-sm font-medium text-ink-2">Download everything we store about you, or delete your account and all of it.</p></div>
        <div className="flex gap-2">
          <a className="btn btn-ghost" href="/api/account">Export my data</a>
          <button className="btn btn-ghost text-coral" onClick={async () => {
            if (!confirm("Delete your account and all alerts, settings and history? This cannot be undone.")) return;
            const r = await fetch("/api/account", { method: "DELETE" }).then((x) => x.json()).catch(() => ({}));
            if (r.ok) location.href = "/"; else setMsg("Could not delete account.");
          }}>Delete my account</button>
        </div>
      </section>
    </div>
  );
}
