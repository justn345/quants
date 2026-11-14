"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

const ICON_SYMBOL: Record<string, string> = { kPEPE: "PEPE", kSHIB: "SHIB", kBONK: "BONK" };

/** Coin logo from Hyperliquid's public icon set, with a solid letter fallback. */
export function CoinIcon({ coin, size = 28 }: { coin: string; size?: number }) {
  const [ok, setOk] = useState(true);
  const sym = ICON_SYMBOL[coin] ?? coin;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-night font-bold text-cream" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      <span aria-hidden>{sym.slice(0, 2)}</span>
      {ok && <img src={`https://app.hyperliquid.xyz/coins/${encodeURIComponent(coin)}.svg`} alt={`${sym} logo`} width={size} height={size} loading="lazy"
        className="absolute inset-0 h-full w-full bg-white object-contain" onError={() => setOk(false)} />}
    </span>
  );
}
