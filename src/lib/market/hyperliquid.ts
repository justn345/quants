// Hyperliquid public info API (no key needed). One fetch per cycle for everyone, never per user.
import { COINS, type Coin } from "./coins";

const HL_INFO = "https://api.hyperliquid.xyz/info";

async function post<T>(body: unknown, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(HL_INFO, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Hyperliquid ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export interface AssetCtx {
  coin: Coin;
  markPx: number;
  midPx: number;
  prevDayPx: number;
  change24hPct: number;
  funding: number; // hourly funding rate
  openInterest: number; // in coins
  openInterestUsd: number;
  dayVolumeUsd: number;
  maxLeverage: number;
}

export async function fetchAssetCtxs(): Promise<Record<Coin, AssetCtx>> {
  type Meta = { universe: { name: string; maxLeverage: number }[] };
  type Ctx = {
    funding: string; openInterest: string; prevDayPx: string; dayNtlVlm: string;
    markPx: string; midPx: string | null;
  };
  const [meta, ctxs] = await post<[Meta, Ctx[]]>({ type: "metaAndAssetCtxs" });
  const out = {} as Record<Coin, AssetCtx>;
  meta.universe.forEach((u, i) => {
    if (!(COINS as readonly string[]).includes(u.name)) return;
    const c = ctxs[i];
    const mark = Number(c.markPx);
    const prev = Number(c.prevDayPx);
    const oi = Number(c.openInterest);
    out[u.name as Coin] = {
      coin: u.name as Coin,
      markPx: mark,
      midPx: c.midPx ? Number(c.midPx) : mark,
      prevDayPx: prev,
      change24hPct: prev ? ((mark - prev) / prev) * 100 : 0,
      funding: Number(c.funding),
      openInterest: oi,
      openInterestUsd: oi * mark,
      dayVolumeUsd: Number(c.dayNtlVlm),
      maxLeverage: u.maxLeverage,
    };
  });
  for (const coin of COINS) if (!out[coin]) throw new Error(`Missing ${coin} in Hyperliquid meta`);
  return out;
}

export interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }

export async function fetchCandles(coin: Coin, interval: "15m" | "1h", hours: number): Promise<Candle[]> {
  const endTime = Date.now();
  const startTime = endTime - hours * 3600_000;
  type Raw = { t: number; o: string; h: string; l: string; c: string; v: string };
  const raw = await post<Raw[]>({ type: "candleSnapshot", req: { coin, interval, startTime, endTime } });
  return raw.map((k) => ({ t: k.t, o: +k.o, h: +k.h, l: +k.l, c: +k.c, v: +k.v }));
}

export interface BookLevel { px: number; sz: number }
export interface Book { bids: BookLevel[]; asks: BookLevel[] }

export async function fetchBook(coin: Coin): Promise<Book> {
  type Raw = { levels: [{ px: string; sz: string }[], { px: string; sz: string }[]] };
  const raw = await post<Raw>({ type: "l2Book", coin });
  const map = (l: { px: string; sz: string }[]) => l.map((x) => ({ px: +x.px, sz: +x.sz }));
  return { bids: map(raw.levels[0]), asks: map(raw.levels[1]) };
}
