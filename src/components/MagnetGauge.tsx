// Gauge: distance from price to the nearest ESTIMATED liquidation cluster (closer = fuller).
import { fmtUsd } from "./ui";

type Cl = { price: number; distancePct: number; side: string } | null;

export function MagnetGauge({ price, factors }: { price: number; factors: Record<string, unknown> }) {
  const a = factors.magnetAbove as Cl, b = factors.magnetBelow as Cl;
  const near = [a, b].filter(Boolean).sort((x, y) => Math.abs(x!.distancePct) - Math.abs(y!.distancePct))[0];
  if (!near || !price) return null;
  const dist = Math.abs(near.distancePct);
  const fill = Math.max(0.04, Math.min(1, 1 - dist / 8)); // 0% away = full, 8%+ = empty
  const r = 34, c = Math.PI * r;
  return (
    <div className="mt-4 flex items-center gap-4 rounded-2xl bg-paper p-3">
      <svg viewBox="0 0 80 46" className="h-12 w-20 shrink-0" aria-hidden>
        <path d="M6 42 A34 34 0 0 1 74 42" fill="none" stroke="#dfe5da" strokeWidth="8" strokeLinecap="round" />
        <path d="M6 42 A34 34 0 0 1 74 42" fill="none" stroke={dist < 1.5 ? "#E5604D" : "#007D10"} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * fill} ${c}`} />
      </svg>
      <div className="text-sm">
        <p className="font-bold">Liquidation magnet {dist.toFixed(1)}% away</p>
        <p className="num font-medium text-ink-2">Estimated {near.side === "short_liq" ? "short" : "long"} liquidations near {fmtUsd(near.price)}</p>
      </div>
    </div>
  );
}
