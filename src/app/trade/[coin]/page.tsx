import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/server";
import { TradeTabs } from "@/components/TradeTabs";
import { CoinIcon, SignalChip, fmtUsd, Logo, Disclaimer } from "@/components/ui";
import { hyperliquidTradeUrl } from "@/lib/trade/oneclick";
import { readRef } from "@/lib/server/ref";
import { currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TradePage({ params, searchParams }: { params: Promise<{ coin: string }>; searchParams: Promise<{ r?: string }> }) {
  const { coin: raw } = await params;
  const ref = (await searchParams).r ?? null;
  const coin = decodeURIComponent(raw);
  if (!/^[A-Za-z0-9]{1,15}$/.test(coin)) notFound();
  const db = adminClient(); // public market data only
  const [{ data: snap }, { data: sig }] = await Promise.all([
    db.from("market_snapshots").select("price,change_24h_pct,spot_via_intents,max_leverage").eq("coin", coin).maybeSingle(),
    db.from("latest_signals").select("direction,label,price,entry_low,entry_high,stop,target,reason,created_at").eq("coin", coin).maybeSingle(),
  ]);
  if (!snap) notFound();
  // Record the Trade click in the user's own history (never blocks the page).
  const uid = readRef(ref) ?? (await currentUser().catch(() => ({ user: null }))).user?.id ?? null;
  if (uid) await db.from("activity").insert({ user_id: uid, kind: "trade_click", coin, meta: { from: ref ? "alert" : "app" } }).then(() => undefined, () => undefined);

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-paper px-4 pb-10 pt-4">
      <header className="flex items-center justify-between"><Link href="/app"><Logo size={28} /></Link><span className="text-xs font-bold text-ink-2">Built on NEAR</span></header>
      <section className="card mt-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3"><CoinIcon coin={coin} size={44} /><div><h1 className="display text-2xl font-black">{coin}</h1><p className="num font-semibold text-ink-2">{fmtUsd(+snap.price)}</p></div></div>
          {sig && <SignalChip direction={sig.direction} label={sig.label} />}
        </div>
        {sig && (<>
          <dl className="num mt-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-xl bg-paper p-2"><dt className="label">Entry</dt><dd className="font-bold">{fmtUsd(+sig.entry_low)}</dd></div>
            <div className="rounded-xl bg-paper p-2"><dt className="label">Stop</dt><dd className="font-bold text-coral">{fmtUsd(+sig.stop)}</dd></div>
            <div className="rounded-xl bg-paper p-2"><dt className="label">Target</dt><dd className="font-bold text-brand">{fmtUsd(+sig.target)}</dd></div>
          </dl>
          <p className="mt-3 text-sm font-medium">{sig.reason}</p>
        </>)}
      </section>

      <TradeTabs coin={coin} spot={!!snap.spot_via_intents} price={+snap.price} maxLev={snap.max_leverage ?? 10} hlUrl={hyperliquidTradeUrl(coin)}
        refToken={readRef(ref) ? ref : null}
        sig={sig ? { direction: sig.direction, entryLow: +sig.entry_low, entryHigh: +sig.entry_high, stop: +sig.stop, target: +sig.target } : null} />
      <div className="mt-4"><Disclaimer /></div>
    </main>
  );
}
