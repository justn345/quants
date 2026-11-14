// Small shared UI pieces.
/* eslint-disable @next/next/no-img-element */
export const DISCLAIMER = "Not financial advice. Do your own research. Signals are estimates and are not guaranteed.";

export function Logo({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="16" fill={light ? "#E3EED4" : "#0F2A1D"} />
        <circle cx="31" cy="31" r="15" fill="none" stroke={light ? "#007D10" : "#2EE59D"} strokeWidth="7" />
        <path d="M36 37 L48 49" stroke={light ? "#007D10" : "#2EE59D"} strokeWidth="7" strokeLinecap="round" />
      </svg>
      <span className="display text-xl font-black tracking-tight">QUANTS</span>
    </span>
  );
}

const ICON_SYMBOL: Record<string, string> = { kPEPE: "PEPE", kSHIB: "SHIB", kBONK: "BONK" };

/** Coin logo from Hyperliquid's public icon set, with a solid letter fallback. */
export function CoinIcon({ coin, size = 28 }: { coin: string; size?: number }) {
  const sym = ICON_SYMBOL[coin] ?? coin;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-night text-cream font-bold" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      <span aria-hidden>{sym.slice(0, 2)}</span>
      <img src={`https://app.hyperliquid.xyz/coins/${encodeURIComponent(coin)}.svg`} alt={`${sym} logo`} width={size} height={size} loading="lazy"
        className="absolute inset-0 h-full w-full bg-white object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
    </span>
  );
}

export function fmtUsd(p: number | null | undefined): string {
  if (p == null || !isFinite(p)) return "–";
  const d = p >= 1000 ? 0 : p >= 1 ? 2 : p >= 0.01 ? 4 : 6;
  return "$" + p.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function Pct({ v }: { v: number | null | undefined }) {
  if (v == null || !isFinite(v)) return <span>–</span>;
  return <span className={`num font-semibold ${v >= 0 ? "text-brand" : "text-coral"}`}>{v >= 0 ? "+" : ""}{v.toFixed(2)}%</span>;
}

export function SignalChip({ direction, label }: { direction: string; label: string }) {
  const cls = direction === "long" ? "chip-long" : direction === "short" ? "chip-short" : "chip-flat";
  return <span className={`chip ${cls}`}>{direction === "long" ? "▲" : direction === "short" ? "▼" : "●"} {label}</span>;
}

export function Disclaimer({ dark = false }: { dark?: boolean }) {
  return <p className={`text-xs font-medium ${dark ? "text-mist" : "text-ink-2"}`}>{DISCLAIMER}</p>;
}
