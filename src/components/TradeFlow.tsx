"use client";
// Spot buy/sell through NEAR Intents (1Click). Steps: choose → price check (dry quote) → deposit address → status.
import { useEffect, useMemo, useState } from "react";
import { fmtUsd } from "./ui";

type Tok = { assetId: string; symbol: string; blockchain: string; decimals: number; price?: number };
const SPOT_SYMBOL = (c: string) => (/^k[A-Z]/.test(c) ? c.slice(1) : c);
const PAY_PREF = ["base", "arb", "sol", "eth", "near", "bsc", "pol", "op"];

export function CopyPlan({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="mt-3 rounded-xl bg-paper p-3">
      <p className="num text-sm font-semibold">{text}</p>
      <button className="mt-2 text-sm font-bold underline" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); }}>{ok ? "Copied" : "Copy trade plan"}</button>
    </div>
  );
}

export function TradeFlow({ coin, spot, price }: { coin: string; spot: boolean; price: number }) {
  const [tokens, setTokens] = useState<Tok[]>([]);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [coinId, setCoinId] = useState("");
  const [payId, setPayId] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [refundTo, setRefundTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [quote, setQuote] = useState<null | { amountOutFormatted: string; amountOutUsd: string; amountInFormatted: string; timeEstimate: number; depositAddress?: string; depositMemo?: string }>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!spot) return;
    fetch("/api/trade/quote").then((r) => r.json()).then((j) => {
      const all: Tok[] = j.tokens ?? [];
      setTokens(all);
      const mine = all.filter((t) => t.symbol.toUpperCase() === SPOT_SYMBOL(coin).toUpperCase());
      setCoinId(mine[0]?.assetId ?? "");
      const usdc = all.filter((t) => t.symbol === "USDC").sort((a, b) => PAY_PREF.indexOf(a.blockchain) - PAY_PREF.indexOf(b.blockchain));
      setPayId(usdc.find((t) => PAY_PREF.includes(t.blockchain))?.assetId ?? usdc[0]?.assetId ?? "");
    }).catch(() => setErr("Could not load NEAR Intents tokens."));
  }, [coin, spot]);

  const coinToks = useMemo(() => tokens.filter((t) => t.symbol.toUpperCase() === SPOT_SYMBOL(coin).toUpperCase()), [tokens, coin]);
  const payToks = useMemo(() => tokens.filter((t) => ["USDC", "USDT"].includes(t.symbol)).sort((a, b) => (PAY_PREF.indexOf(a.blockchain) + 99) % 99 - (PAY_PREF.indexOf(b.blockchain) + 99) % 99), [tokens]);
  const ct = tokens.find((t) => t.assetId === coinId), pt = tokens.find((t) => t.assetId === payId);
  const from = side === "buy" ? pt : ct, to = side === "buy" ? ct : pt;

  useEffect(() => {
    if (!quote?.depositAddress) return;
    const id = setInterval(async () => {
      const r = await fetch(`/api/trade/status?d=${encodeURIComponent(quote.depositAddress!)}`).then((x) => x.json()).catch(() => ({}));
      if (r.status) setStatus(r.status);
      if (["SUCCESS", "REFUNDED", "FAILED"].includes(r.status)) clearInterval(id);
    }, 8000);
    return () => clearInterval(id);
  }, [quote?.depositAddress]);

  if (!spot) {
    return (
      <section className="card mt-4 p-5">
        <h2 className="text-lg font-extrabold">Spot swap</h2>
        <p className="mt-1 text-sm font-medium text-ink-2">{coin} isn&apos;t available through NEAR Intents yet. Trade it on Hyperliquid below. You can still move USDC into Hyperliquid through NEAR Intents.</p>
      </section>
    );
  }

  const ask = async (dry: boolean) => {
    setBusy(true); setErr("");
    const r = await fetch("/api/trade/quote", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coin, side, coinAssetId: coinId, payAssetId: payId, amount, recipient, refundTo, dry }) }).then((x) => x.json()).catch(() => ({ error: "Network error" }));
    setBusy(false);
    if (r.quote) setQuote(r.quote); else setErr(r.error ?? "Quote failed");
  };

  return (
    <section className="card mt-4 p-5">
      <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Spot {side} via NEAR Intents</h2><span className="chip chip-long">Non-custodial</span></div>
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-full bg-paper p-1">
        {(["buy", "sell"] as const).map((s) => <button key={s} onClick={() => { setSide(s); setQuote(null); }} className={`h-10 rounded-full font-bold ${side === s ? (s === "buy" ? "bg-signal text-ink" : "bg-coral text-white") : ""}`}>{s === "buy" ? `Buy ${coin}` : `Sell ${coin}`}</button>)}
      </div>
      {!quote?.depositAddress && (
        <div className="mt-4 space-y-3">
          <label className="block space-y-1"><span className="label">{side === "buy" ? "Pay with" : "Receive"}</span>
            <select className="input" value={payId} onChange={(e) => { setPayId(e.target.value); setQuote(null); }}>{payToks.map((t) => <option key={t.assetId} value={t.assetId}>{t.symbol} on {t.blockchain.toUpperCase()}</option>)}</select></label>
          <label className="block space-y-1"><span className="label">{coin} network</span>
            <select className="input" value={coinId} onChange={(e) => { setCoinId(e.target.value); setQuote(null); }}>{coinToks.map((t) => <option key={t.assetId} value={t.assetId}>{t.symbol} on {t.blockchain.toUpperCase()}</option>)}</select></label>
          <label className="block space-y-1"><span className="label">Amount of {from?.symbol ?? "token"} you send</span>
            <input className="input num" inputMode="decimal" placeholder={side === "buy" ? "e.g. 50" : "e.g. 0.5"} value={amount} onChange={(e) => { setAmount(e.target.value.replace(",", ".")); setQuote(null); }} /></label>
          <label className="block space-y-1"><span className="label">Your {to?.blockchain.toUpperCase()} address (receives {to?.symbol})</span>
            <input className="input num text-sm" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Your own wallet address" /></label>
          <label className="block space-y-1"><span className="label">Your {from?.blockchain.toUpperCase()} address (refund if it fails)</span>
            <input className="input num text-sm" value={refundTo} onChange={(e) => setRefundTo(e.target.value)} placeholder="Your own wallet address" /></label>
          {side === "buy" && amount && price > 0 && pt?.price && <p className="num text-sm font-semibold text-ink-2">≈ {(+amount * pt.price / price).toPrecision(4)} {coin} at {fmtUsd(price)} (before fees)</p>}
          {!quote ? (
            <button className="btn btn-primary w-full" disabled={busy || !amount || !recipient || !refundTo} onClick={() => ask(true)}>{busy ? "Checking price…" : "Check price"}</button>
          ) : (
            <div className="rounded-2xl bg-lime p-4 text-night">
              <p className="label text-night">NEAR Intents quote</p>
              <p className="num mt-1 text-lg font-extrabold">You get ≈ {quote.amountOutFormatted} {to?.symbol} (${(+quote.amountOutUsd).toFixed(2)})</p>
              <p className="text-sm font-semibold">You send {quote.amountInFormatted} {from?.symbol} · about {Math.max(1, Math.round(quote.timeEstimate / 60))} min</p>
              <button className="btn btn-dark mt-3 w-full" disabled={busy} onClick={() => ask(false)}>{busy ? "Getting address…" : "Get deposit address"}</button>
              <p className="mt-2 text-xs font-semibold">Nothing moves until you send funds from your own wallet.</p>
            </div>
          )}
        </div>
      )}
      {quote?.depositAddress && (
        <div className="mt-4 space-y-3">
          <p className="font-bold">Send exactly <span className="num">{quote.amountInFormatted} {from?.symbol}</span> on {from?.blockchain.toUpperCase()} to:</p>
          <p className="num break-all rounded-xl bg-paper p-3 text-sm font-bold">{quote.depositAddress}</p>
          {quote.depositMemo && <p className="num text-sm font-bold">Memo: {quote.depositMemo}</p>}
          <button className="btn btn-ghost w-full" onClick={() => navigator.clipboard?.writeText(quote.depositAddress!)}>Copy address</button>
          <p className="text-sm font-semibold">You will receive ≈ {quote.amountOutFormatted} {to?.symbol} at your own address.</p>
          <p className="chip chip-flat">Status: {status || "Waiting for your deposit"}</p>
        </div>
      )}
      {err && <p role="alert" className="mt-3 text-sm font-semibold text-coral">{err}</p>}
    </section>
  );
}

