"use client";
// Leverage (long/short) for any coin. Step 1: fund your own Hyperliquid perps account through NEAR Intents
// from any chain. Step 2: open the position on Hyperliquid with the signal's levels. Quants never holds funds.
import { useEffect, useMemo, useState } from "react";
import { fmtUsd } from "./ui";

type Tok = { assetId: string; symbol: string; blockchain: string; decimals: number };
type Q = { amountInFormatted: string; amountOutFormatted: string; timeEstimate: number; depositAddress?: string };
const PAY_PREF = ["arb", "base", "sol", "eth", "near", "bsc", "pol", "op"];

export function LeverageFlow({ coin, price, maxLev, sig, hlUrl, refToken }: {
  coin: string; price: number; maxLev: number; hlUrl: string; refToken: string | null;
  sig: { direction: string; entryLow: number; entryHigh: number; stop: number; target: number } | null;
}) {
  const [side, setSide] = useState<"long" | "short">(sig?.direction === "short" ? "short" : "long");
  const [lev, setLev] = useState(Math.min(5, maxLev));
  const [margin, setMargin] = useState("50");
  const [tokens, setTokens] = useState<Tok[]>([]);
  const [payId, setPayId] = useState("");
  const [hl, setHl] = useState("");
  const [refund, setRefund] = useState("");
  const [quote, setQuote] = useState<Q | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/trade/quote").then((r) => r.json()).then((j) => {
      const list: Tok[] = (j.tokens ?? []).filter((t: Tok) => ["USDC", "USDT"].includes(t.symbol));
      list.sort((a, b) => (PAY_PREF.indexOf(a.blockchain) + 99) % 99 - (PAY_PREF.indexOf(b.blockchain) + 99) % 99);
      setTokens(list); setPayId(list[0]?.assetId ?? "");
    }).catch(() => setErr("Could not load NEAR Intents tokens."));
  }, []);

  useEffect(() => {
    if (!quote?.depositAddress) return;
    const id = setInterval(async () => {
      const r = await fetch(`/api/trade/status?d=${encodeURIComponent(quote.depositAddress!)}`).then((x) => x.json()).catch(() => ({}));
      if (r.status) setStatus(r.status);
      if (["SUCCESS", "REFUNDED", "FAILED"].includes(r.status)) clearInterval(id);
    }, 8000);
    return () => clearInterval(id);
  }, [quote?.depositAddress]);

  const m = Number(margin) || 0;
  const size = m * lev;
  // Rough isolated-margin liquidation estimate (ignores fees and funding).
  const liq = useMemo(() => (side === "long" ? price * (1 - 1 / lev + 0.005) : price * (1 + 1 / lev - 0.005)), [side, lev, price]);
  const pay = tokens.find((t) => t.assetId === payId);
  const plan = `${coin} ${side.toUpperCase()} ${lev}x | margin $${m} (size $${size.toFixed(0)}) | entry ${sig ? `${fmtUsd(sig.entryLow)}-${fmtUsd(sig.entryHigh)}` : fmtUsd(price)}${sig ? ` | stop ${fmtUsd(sig.stop)} | target ${fmtUsd(sig.target)}` : ""}`;
  const against = sig && sig.direction !== "none" && sig.direction !== side;

  const ask = async (dry: boolean) => {
    setBusy(true); setErr("");
    const r = await fetch("/api/trade/fund", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coin, payAssetId: payId, amount: margin, hlAddress: hl.trim(), refundTo: refund.trim(), dry, ref: refToken ?? undefined }) })
      .then((x) => x.json()).catch(() => ({ error: "Network error" }));
    setBusy(false);
    if (r.quote) setQuote(r.quote); else setErr(r.error ?? "Quote failed");
  };

  return (
    <section className="card mt-4 p-5">
      <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Leverage {coin}</h2><span className="chip chip-flat">Up to {maxLev}x</span></div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-full bg-paper p-1">
        {(["long", "short"] as const).map((s) => <button key={s} onClick={() => setSide(s)} className={`h-10 rounded-full font-bold ${side === s ? (s === "long" ? "bg-signal text-ink" : "bg-coral text-white") : ""}`}>{s === "long" ? "▲ Long" : "▼ Short"}</button>)}
      </div>
      {against && <p className="mt-2 text-xs font-bold text-coral">Heads up: the current Quants signal leans {sig!.direction}.</p>}

      <label className="mt-4 block"><span className="label">Leverage: {lev}x</span>
        <input type="range" min={1} max={maxLev} value={lev} onChange={(e) => setLev(+e.target.value)} className="mt-2 w-full accent-[#0F2A1D]" aria-label="Leverage" /></label>
      <label className="mt-3 block space-y-1"><span className="label">Margin (USDC you put in)</span>
        <input className="input num" inputMode="decimal" value={margin} onChange={(e) => { setMargin(e.target.value.replace(",", ".")); setQuote(null); }} /></label>
      <dl className="num mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-paper p-2"><dt className="label">Position</dt><dd className="font-bold">${size.toFixed(0)}</dd></div>
        <div className="rounded-xl bg-paper p-2"><dt className="label">Entry</dt><dd className="font-bold">{fmtUsd(price)}</dd></div>
        <div className="rounded-xl bg-paper p-2"><dt className="label">Est. liq.</dt><dd className="font-bold text-coral">{fmtUsd(liq)}</dd></div>
      </dl>

      <div className="mt-5 rounded-2xl border border-line p-4">
        <p className="font-extrabold">Step 1 · Fund your Hyperliquid account via NEAR Intents</p>
        <p className="mt-1 text-xs font-semibold text-ink-2">Pay USDC/USDT from any chain; it arrives as USDC in your own Hyperliquid perps balance. No bridge, no custodian.</p>
        {!quote?.depositAddress ? (
          <div className="mt-3 space-y-3">
            <label className="block space-y-1"><span className="label">Pay with</span>
              <select className="input" value={payId} onChange={(e) => { setPayId(e.target.value); setQuote(null); }}>{tokens.map((t) => <option key={t.assetId} value={t.assetId}>{t.symbol} on {t.blockchain.toUpperCase()}</option>)}</select></label>
            <label className="block space-y-1"><span className="label">Your Hyperliquid address (0x…)</span><input className="input num text-sm" value={hl} onChange={(e) => setHl(e.target.value)} placeholder="0x…" /></label>
            <label className="block space-y-1"><span className="label">Your {pay?.blockchain.toUpperCase()} address (refund if it fails)</span><input className="input num text-sm" value={refund} onChange={(e) => setRefund(e.target.value)} /></label>
            {!quote ? <button className="btn btn-dark w-full" disabled={busy || !m || !hl || !refund} onClick={() => ask(true)}>{busy ? "Checking…" : "Check funding quote"}</button> : (
              <div className="rounded-2xl bg-lime p-4 text-night">
                <p className="num font-extrabold">You send {quote.amountInFormatted} {pay?.symbol} → ≈ {quote.amountOutFormatted} USDC on Hyperliquid</p>
                <p className="text-sm font-semibold">About {Math.max(1, Math.round(quote.timeEstimate / 60))} min · NEAR Intents</p>
                <button className="btn btn-dark mt-3 w-full" disabled={busy} onClick={() => ask(false)}>{busy ? "Getting address…" : "Get deposit address"}</button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-bold">Send exactly <span className="num">{quote.amountInFormatted} {pay?.symbol}</span> on {pay?.blockchain.toUpperCase()} to:</p>
            <p className="num break-all rounded-xl bg-paper p-3 text-sm font-bold">{quote.depositAddress}</p>
            <button className="btn btn-ghost w-full" onClick={() => navigator.clipboard?.writeText(quote.depositAddress!)}>Copy address</button>
            <p className="chip chip-flat">Status: {status || "Waiting for your deposit"}</p>
          </div>
        )}
        {err && <p role="alert" className="mt-2 text-sm font-semibold text-coral">{err}</p>}
      </div>

      <div className="mt-3 rounded-2xl border border-line p-4">
        <p className="font-extrabold">Step 2 · Open the {side} on Hyperliquid</p>
        <p className="num mt-2 rounded-xl bg-paper p-3 text-sm font-semibold">{plan}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(plan); setCopied(true); }}>{copied ? "Copied" : "Copy plan"}</button>
          <a className="btn btn-dark" href={hlUrl} target="_blank" rel="noopener noreferrer">Open {coin} ↗</a>
        </div>
      </div>
    </section>
  );
}
