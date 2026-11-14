// The five coins Quants watches. Kept dependency-free so it can run in Next.js and Supabase Edge (Deno).
export const COINS = ["BTC", "ETH", "SOL", "BNB", "HYPE"] as const;
export type Coin = (typeof COINS)[number];

export function isCoin(x: unknown): x is Coin {
  return typeof x === "string" && (COINS as readonly string[]).includes(x.toUpperCase());
}

export const COIN_NAMES: Record<Coin, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  BNB: "BNB",
  HYPE: "Hyperliquid",
};

// Price precision for display and for rounding levels.
export const COIN_DECIMALS: Record<Coin, number> = { BTC: 0, ETH: 2, SOL: 2, BNB: 2, HYPE: 3 };

export function roundPx(coin: Coin, px: number): number {
  const d = COIN_DECIMALS[coin];
  const f = 10 ** d;
  return Math.round(px * f) / f;
}
