// Small shared UI pieces.
export const DISCLAIMER = "Not financial advice. Do your own research. Signals are estimates and are not guaranteed.";

export function Logo({ size = 32, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden className={light ? "rounded-[22%] ring-1 ring-forest" : "rounded-[22%]"}>
        <rect width="512" height="512" rx="112" fill="#0B1F17" />
        <circle cx="246" cy="246" r="132" fill="none" stroke="#F2F0E6" strokeWidth="44" />
        <path d="M296 296 L398 398" stroke="#F2F0E6" strokeWidth="44" />
        <path d="M172 296 L232 236 L264 268 L318 214" fill="none" stroke="#2EE59D" strokeWidth="28" />
        <path d="M282 198 L330 198 L330 246" fill="none" stroke="#2EE59D" strokeWidth="28" />
      </svg>
      <span className="display text-xl font-black tracking-tight">QUANTS<span className="text-signal"> AI</span></span>
    </span>
  );
}

export { CoinIcon } from "./CoinIcon";

import { fmtPrice } from "@/lib/format";
export const fmtUsd = fmtPrice;

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
