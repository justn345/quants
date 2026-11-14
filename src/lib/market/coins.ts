// Coins. Every live Hyperliquid perp is supported (about 180). Five are "featured": the defaults for
// new users, the landing intro orbit, and always get an AI-written reason each cycle.
// Kept dependency-free so it can run in Next.js and Supabase Edge (Deno).
export const FEATURED = ["BTC", "ETH", "SOL", "BNB", "HYPE"] as const;
export type Coin = string; // Hyperliquid symbol, e.g. "BTC", "XRP", "kPEPE"

const SYMBOL_RE = /^[A-Za-z0-9]{1,15}$/;

/** Shape check only. Membership is checked against the live universe (see isListed). */
export function isSymbol(x: unknown): x is Coin {
  return typeof x === "string" && SYMBOL_RE.test(x);
}

export function isListed(x: unknown, universe: Iterable<Coin>): x is Coin {
  if (!isSymbol(x)) return false;
  for (const c of universe) if (c === x) return true;
  return false;
}

export const COIN_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", BNB: "BNB", HYPE: "Hyperliquid",
  XRP: "XRP", DOGE: "Dogecoin", NEAR: "NEAR", ADA: "Cardano", AVAX: "Avalanche", SUI: "Sui",
  LINK: "Chainlink", ZEC: "Zcash", LTC: "Litecoin", TRX: "TRON", kPEPE: "Pepe (1000x)",
};

/**
 * Round to Hyperliquid's price rules: at most 5 significant figures and
 * at most (6 - szDecimals) decimals. szDecimals defaults to a sensible value by price.
 */
export function roundPx(price: number, szDecimals?: number): number {
  if (!isFinite(price) || price <= 0) return price;
  const maxDec = Math.max(0, 6 - (szDecimals ?? (price >= 1000 ? 5 : price >= 10 ? 2 : 0)));
  const sigDec = Math.max(0, 5 - Math.floor(Math.log10(price)) - 1);
  const d = Math.min(maxDec, sigDec);
  const f = 10 ** d;
  return Math.round(price * f) / f;
}
