// NEAR Intents 1Click API: which coins can be bought/sold spot, non-custodially.
// Docs: https://docs.near-intents.org (GET /v0/tokens, POST /v0/quote, GET /v0/status).
import type { Coin } from "../market/coins";

export const ONECLICK_BASE = "https://1click.chaindefuser.com";

export interface OneClickToken {
  assetId: string; symbol: string; blockchain: string; decimals: number;
  price?: number; contractAddress?: string;
}

export async function fetchOneClickTokens(timeoutMs = 8000): Promise<OneClickToken[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${ONECLICK_BASE}/v0/tokens`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`1Click ${res.status}`);
    const list = (await res.json()) as OneClickToken[];
    return list.filter((x) => !/DEPRECATED/i.test(x.symbol));
  } finally {
    clearTimeout(t);
  }
}

/** Hyperliquid symbol → the token symbol 1Click uses. Hyperliquid prefixes 1000x tokens with "k". */
export function toSpotSymbol(hl: Coin): string {
  return /^k[A-Z]/.test(hl) ? hl.slice(1) : hl;
}

/**
 * For each Hyperliquid coin, the 1Click tokens (one per chain) a user can receive.
 * Coins with no entry are not spot-tradable via NEAR Intents → show "Trade on Hyperliquid".
 */
export function spotMarkets(universe: Iterable<Coin>, tokens: OneClickToken[]): Map<Coin, OneClickToken[]> {
  const bySymbol = new Map<string, OneClickToken[]>();
  for (const tk of tokens) {
    const key = tk.symbol.toUpperCase().replace(/^\$/, "");
    bySymbol.set(key, [...(bySymbol.get(key) ?? []), tk]);
  }
  const out = new Map<Coin, OneClickToken[]>();
  for (const c of universe) {
    const hits = bySymbol.get(toSpotSymbol(c).toUpperCase());
    if (hits?.length) out.set(c, hits);
  }
  return out;
}

export function hyperliquidTradeUrl(coin: Coin, referral?: string): string {
  const base = `https://app.hyperliquid.xyz/trade/${encodeURIComponent(coin)}`;
  return referral ? `https://app.hyperliquid.xyz/join/${encodeURIComponent(referral)}` : base;
}
