// Basic, clearly-labelled signals. Pure maths: works with or without AI.
import { roundPx, type Coin } from "./coins";
import { fmtPrice } from "../format";
import type { AssetCtx, Book, Candle } from "./hyperliquid";
import { estimateClusters, nearestMagnets, type Cluster } from "./liquidations";

export type Direction = "long" | "short" | "none";

export interface SignalFactors {
  trend: number; // -1..1
  funding: number; // -1..1 (contrarian)
  oi: number; // -1..1
  book: number; // -1..1
  magnet: number; // -1..1
  ema9: number; ema21: number; ret4hPct: number; atr: number;
  fundingHourly: number; oiChangePct: number | null; bookImbalance: number;
  bidWall: { px: number; usd: number } | null;
  askWall: { px: number; usd: number } | null;
  magnetAbove: Cluster | null; magnetBelow: Cluster | null;
}

export interface Signal {
  coin: Coin;
  direction: Direction;
  label: "Leaning long" | "Leaning short" | "No clear edge";
  score: number;
  price: number;
  keyLevel: number;
  entryLow: number; entryHigh: number;
  stop: number; target: number;
  factors: SignalFactors;
  createdAt: string;
}

const clamp = (x: number, a = -1, b = 1) => Math.max(a, Math.min(b, x));

export function ema(values: number[], period: number): number {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

export function atr(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const k = candles[i], p = candles[i - 1];
    trs.push(Math.max(k.h - k.l, Math.abs(k.h - p.c), Math.abs(k.l - p.c)));
  }
  const last = trs.slice(-period);
  return last.reduce((s, x) => s + x, 0) / last.length;
}

function walls(book: Book, mid: number, rangePct = 0.01) {
  const inRange = (l: { px: number }) => Math.abs(l.px - mid) / mid <= rangePct;
  const bids = book.bids.filter(inRange), asks = book.asks.filter(inRange);
  const usd = (l: { px: number; sz: number }) => l.px * l.sz;
  const bidUsd = bids.reduce((s, l) => s + usd(l), 0);
  const askUsd = asks.reduce((s, l) => s + usd(l), 0);
  const top = (ls: typeof bids) => {
    const b = [...ls].sort((a, z) => usd(z) - usd(a))[0];
    return b ? { px: b.px, usd: usd(b) } : null;
  };
  return { bidUsd, askUsd, bidWall: top(bids), askWall: top(asks) };
}

/**
 * @param candles15m about 24h of 15m candles (oldest first)
 * @param prevOiUsd open interest (USD) from the previous cycle, if stored
 */
export function computeSignal(coin: Coin, ctx: AssetCtx, candles15m: Candle[], book: Book, prevOiUsd: number | null): Signal {
  const price = ctx.markPx;
  const closes = candles15m.map((k) => k.c);
  const e9 = ema(closes, 9), e21 = ema(closes, 21);
  const a = atr(candles15m) || price * 0.004;
  const c4h = candles15m[Math.max(0, candles15m.length - 17)]?.c ?? price;
  const ret4h = ((price - c4h) / c4h) * 100;

  // 1) Trend: EMA cross distance in ATRs plus 4h return.
  const trend = clamp(((e9 - e21) / a) * 0.6 + clamp(ret4h / 3) * 0.4);

  // 2) Funding (contrarian): very positive funding = crowded longs.
  // Hyperliquid base funding is 0.00125%/h; treat 3x that as crowded.
  const base = 0.0000125;
  const funding = clamp(-(ctx.funding - base) / (base * 3));

  // 3) Open interest change confirms the trend when rising with price.
  let oi = 0, oiChangePct: number | null = null;
  if (prevOiUsd && prevOiUsd > 0) {
    oiChangePct = ((ctx.openInterestUsd - prevOiUsd) / prevOiUsd) * 100;
    oi = clamp((oiChangePct / 2) * Math.sign(ret4h || 1));
  }

  // 4) Order book walls within 1%.
  const w = walls(book, ctx.midPx);
  const imbalance = w.askUsd > 0 ? w.bidUsd / w.askUsd : 1;
  const bookScore = clamp(Math.log(imbalance) / Math.log(2));

  // 5) Liquidation magnets: price tends to be pulled toward the bigger nearby cluster.
  const clusters = estimateClusters(candles15m, price, ctx.openInterestUsd);
  const { above, below } = nearestMagnets(clusters);
  let magnet = 0;
  if (above || below) {
    const pull = (c?: Cluster) => (c ? c.notionalUsd / Math.max(0.5, Math.abs(c.distancePct)) : 0);
    const up = pull(above), down = pull(below);
    magnet = clamp((up - down) / Math.max(up, down, 1));
  }

  const score = trend * 1.5 + funding * 0.75 + oi * 0.75 + bookScore * 0.5 + magnet * 1.0;
  const direction: Direction = score >= 1.2 ? "long" : score <= -1.2 ? "short" : "none";

  let keyLevel: number, entryLow: number, entryHigh: number, stop: number, target: number;
  if (direction === "long") {
    entryLow = price - 0.3 * a; entryHigh = price;
    stop = Math.min(price - 1.5 * a, w.bidWall ? w.bidWall.px - 0.2 * a : Infinity);
    target = above && above.price > price + a ? above.price : price + 2.5 * a;
    keyLevel = w.bidWall?.px ?? entryLow;
  } else if (direction === "short") {
    entryLow = price; entryHigh = price + 0.3 * a;
    stop = Math.max(price + 1.5 * a, w.askWall ? w.askWall.px + 0.2 * a : -Infinity);
    target = below && below.price < price - a ? below.price : price - 2.5 * a;
    keyLevel = w.askWall?.px ?? entryHigh;
  } else {
    entryLow = price - 0.5 * a; entryHigh = price + 0.5 * a;
    stop = price - 1.5 * a; target = price + 1.5 * a;
    keyLevel = (above && below ? (Math.abs(above.distancePct) < Math.abs(below.distancePct) ? above : below) : above ?? below)?.price ?? price;
  }

  const r = (x: number) => roundPx(x, ctx.szDecimals);
  return {
    coin, direction,
    label: direction === "long" ? "Leaning long" : direction === "short" ? "Leaning short" : "No clear edge",
    score: Math.round(score * 100) / 100,
    price: r(price), keyLevel: r(keyLevel), entryLow: r(entryLow), entryHigh: r(entryHigh), stop: r(stop), target: r(target),
    factors: {
      trend, funding, oi, book: bookScore, magnet,
      ema9: e9, ema21: e21, ret4hPct: ret4h, atr: a,
      fundingHourly: ctx.funding, oiChangePct, bookImbalance: imbalance,
      bidWall: w.bidWall, askWall: w.askWall, magnetAbove: above ?? null, magnetBelow: below ?? null,
    },
    createdAt: new Date().toISOString(),
  };
}

export type Outcome = "hit_target" | "hit_stop" | "neither" | "no_trade";

/** Score a past signal against the candles that followed it (whichever level was touched first). */
export function scoreSignal(sig: Pick<Signal, "direction" | "stop" | "target">, after: Candle[]): Outcome {
  if (sig.direction === "none") return "no_trade";
  for (const k of after) {
    const hitT = sig.direction === "long" ? k.h >= sig.target : k.l <= sig.target;
    const hitS = sig.direction === "long" ? k.l <= sig.stop : k.h >= sig.stop;
    if (hitT && hitS) return "hit_stop"; // same candle: assume the worse case, stay honest
    if (hitT) return "hit_target";
    if (hitS) return "hit_stop";
  }
  return "neither";
}

/** Template reason, used when NEAR AI is unavailable. Never breaks. */
export function templateReason(s: Signal): string {
  const f = s.factors;
  const trendTxt = f.trend > 0.3 ? "Short-term trend is up" : f.trend < -0.3 ? "Short-term trend is down" : "Trend is flat";
  const fundTxt = f.funding < -0.3 ? "longs are paying high funding" : f.funding > 0.3 ? "shorts are crowded" : "funding is normal";
  const mag = f.magnetAbove && (!f.magnetBelow || f.magnetAbove.notionalUsd >= f.magnetBelow.notionalUsd)
    ? `Estimated short liquidations sit near ${fmtPrice(f.magnetAbove.price)}.`
    : f.magnetBelow ? `Estimated long liquidations sit near ${fmtPrice(f.magnetBelow.price)}.` : "No big liquidation cluster nearby.";
  return `${trendTxt} and ${fundTxt}. ${mag}`;
}
