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

// ---------- Address checks (per chain, before any quote) ----------
const B58 = "[1-9A-HJ-NP-Za-km-z]";
const ADDRESS_RULES: Record<string, RegExp> = {
  btc: /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
  sol: new RegExp(`^${B58}{32,44}$`),
  near: /^([a-f0-9]{64}|(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+)$/,
  tron: new RegExp(`^T${B58}{33}$`),
  doge: new RegExp(`^D${B58}{25,34}$`),
  ltc: /^(ltc1[02-9ac-hj-np-z]{11,71}|[LM3][1-9A-HJ-NP-Za-km-z]{26,33})$/,
  xrp: new RegExp(`^r${B58}{24,34}$`),
  sui: /^0x[a-fA-F0-9]{64}$/,
  aptos: /^0x[a-fA-F0-9]{1,64}$/,
  stellar: /^G[A-Z2-7]{55}$/,
  cardano: /^addr1[0-9a-z]{50,120}$/,
};
const EVM = /^0x[a-fA-F0-9]{40}$/;
const EVM_CHAINS = new Set(["eth", "arb", "base", "bsc", "pol", "op", "avax", "gnosis", "bera", "monad", "xlayer", "scroll", "abs", "hood", "plasma"]);

/** True if the address looks valid for the chain. Unknown chains are rejected (safer). */
export function isValidAddress(chain: string, address: string): boolean {
  const a = address.trim();
  if (a.length < 10 || a.length > 128) return chain === "near" && ADDRESS_RULES.near.test(a) && a.length >= 2;
  if (EVM_CHAINS.has(chain)) return EVM.test(a);
  const rule = ADDRESS_RULES[chain];
  return rule ? rule.test(a) : false;
}

// ---------- Quotes and status ----------
export interface QuoteInput {
  originAsset: string;       // 1Click assetId the user pays with
  destinationAsset: string;  // 1Click assetId the user receives
  amount: string;            // smallest units of originAsset
  recipient: string;         // user's own address on the destination chain
  refundTo: string;          // user's own address on the origin chain
  slippageBps?: number;
  dry?: boolean;             // dry = price check only, no deposit address
}

export interface QuoteResult {
  depositAddress?: string;
  depositMemo?: string;
  amountIn: string; amountInFormatted: string; amountInUsd: string;
  amountOut: string; amountOutFormatted: string; amountOutUsd: string; minAmountOut: string;
  deadline?: string; timeEstimate: number;
}

function authHeaders(): Record<string, string> {
  const jwt = typeof process !== "undefined" ? process.env.ONECLICK_JWT : undefined;
  return { "Content-Type": "application/json", ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) };
}

/** App fee in basis points (default 0). Goes to NEAR_PAYOUT_ACCOUNT inside NEAR Intents only if set > 0. */
function appFees() {
  const bps = Number(process.env.ONECLICK_APP_FEE_BPS ?? 0);
  const recipient = process.env.NEAR_PAYOUT_ACCOUNT;
  return bps > 0 && bps <= 100 && recipient ? [{ recipient, fee: bps }] : undefined;
}

export async function getQuote(q: QuoteInput): Promise<{ quote: QuoteResult; correlationId?: string }> {
  const body = {
    dry: q.dry ?? true,
    swapType: "EXACT_INPUT",
    slippageTolerance: Math.min(Math.max(q.slippageBps ?? 100, 10), 300),
    originAsset: q.originAsset,
    depositType: "ORIGIN_CHAIN",
    destinationAsset: q.destinationAsset,
    amount: q.amount,
    refundTo: q.refundTo,
    refundType: "ORIGIN_CHAIN",
    recipient: q.recipient,
    recipientType: "DESTINATION_CHAIN",
    deadline: new Date(Date.now() + 30 * 60_000).toISOString(),
    referral: "quants",
    ...(appFees() ? { appFees: appFees() } : {}),
  };
  const res = await fetch(`${ONECLICK_BASE}/v0/quote`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as { quote?: QuoteResult; correlationId?: string; message?: string };
  if (!res.ok || !j.quote) throw new Error(j.message ?? `1Click quote failed (${res.status})`);
  return { quote: j.quote, correlationId: j.correlationId };
}

export type SwapStatus = "KNOWN_DEPOSIT_TX" | "PENDING_DEPOSIT" | "INCOMPLETE_DEPOSIT" | "PROCESSING" | "SUCCESS" | "REFUNDED" | "FAILED";

export async function getStatus(depositAddress: string): Promise<{ status: SwapStatus; updatedAt?: string }> {
  const res = await fetch(`${ONECLICK_BASE}/v0/status?depositAddress=${encodeURIComponent(depositAddress)}`, { headers: authHeaders() });
  const j = (await res.json().catch(() => ({}))) as { status?: SwapStatus; updatedAt?: string; message?: string };
  if (!res.ok || !j.status) throw new Error(j.message ?? `1Click status failed (${res.status})`);
  return { status: j.status, updatedAt: j.updatedAt };
}

export function hyperliquidTradeUrl(coin: Coin, referral?: string): string {
  const base = `https://app.hyperliquid.xyz/trade/${encodeURIComponent(coin)}`;
  return referral ? `https://app.hyperliquid.xyz/join/${encodeURIComponent(referral)}` : base;
}
