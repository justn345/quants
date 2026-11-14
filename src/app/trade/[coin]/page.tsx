import Link from "next/link";
import { notFound } from "next/navigation";
import { adminClient } from "@/lib/supabase/server";
import { TradeFlow, CopyPlan } from "@/components/TradeFlow";
import { CoinIcon, SignalChip, fmtUsd, Logo, Disclaimer } from "@/components/ui";
import { hyperliquidTradeUrl } from "@/lib/trade/oneclick";

export const dynamic = "force-dynamic";

export default async function TradePage({ params }: { params: Promise<{ coin: string }> }) {
  const { coin: raw } = await params;
  const coin = decodeURIComponent(raw);
  if (!/^[A-Za-z0-9]{1,15}$/.test(coin)) notFound();
  const db = adminClient(); // public market data only
  const [{ data: snap }, { data: sig }] = await Promise.all([
    db.from("market_snapshots").select("price,change_24h_pct,spot_via_intents,max_leverage").eq("coin", coin).maybeSingle(),
    db.from("latest_signals").select("direction,label,price,entry_low,entry_high,stop,target,reason,created_at").eq("coin", coin).maybeSingle(),
  ]);
  if (!snap) notFound();
  const side = sig?.direction === "short" ? "Short" : "Long";
  const plan = sig ? `${coin} ${side} | Entry ${fmtUsd(+sig.entry_low)}-${fmtUsd(+sig.entry_high)} | Stop ${fmtUsd(+sig.stop)} | Target ${fmtUsd(+sig.target)}` : "";

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

      <TradeFlow coin={coin} spot={!!snap.spot_via_intents} price={+snap.price} />

      <section className="card mt-4 p-5">
        <h2 className="text-lg font-extrabold">Trade with leverage on Hyperliquid</h2>
        <p className="mt-1 text-sm font-medium text-ink-2">Opens {coin} in your own Hyperliquid account (up to {snap.max_leverage}x). You can fund it with USDC through NEAR Intents above. Quants never touches your funds.</p>
        {plan && <CopyPlan text={plan} />}
        <a className="btn btn-dark mt-3 w-full" href={hyperliquidTradeUrl(coin)} target="_blank" rel="noopener noreferrer">Open {coin} on Hyperliquid</a>
      </section>
      <div className="mt-4"><Disclaimer /></div>
    </main>
  );
}
