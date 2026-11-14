"use client";
import { useState } from "react";
import { TradeFlow } from "./TradeFlow";
import { LeverageFlow } from "./LeverageFlow";

type Sig = { direction: string; entryLow: number; entryHigh: number; stop: number; target: number } | null;

export function TradeTabs({ coin, spot, price, maxLev, sig, hlUrl, refToken }: { coin: string; spot: boolean; price: number; maxLev: number; sig: Sig; hlUrl: string; refToken: string | null }) {
  const [tab, setTab] = useState<"lev" | "spot">("lev");
  return (
    <div className="mt-4">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-line">
        <button role="tab" aria-selected={tab === "lev"} onClick={() => setTab("lev")} className={`h-10 rounded-full text-sm font-extrabold ${tab === "lev" ? "bg-night text-signal" : ""}`}>Leverage · Long / Short</button>
        <button role="tab" aria-selected={tab === "spot"} onClick={() => setTab("spot")} className={`h-10 rounded-full text-sm font-extrabold ${tab === "spot" ? "bg-night text-signal" : ""}`}>Spot · Buy / Sell</button>
      </div>
      <p className="mt-2 text-center text-xs font-semibold text-ink-2">Both routes move money through <b>NEAR Intents</b> into your own accounts. Quants never holds funds.</p>
      {tab === "lev"
        ? <LeverageFlow coin={coin} price={price} maxLev={maxLev} sig={sig} hlUrl={hlUrl} refToken={refToken} />
        : <TradeFlow coin={coin} spot={spot} price={price} refToken={refToken} />}
    </div>
  );
}
