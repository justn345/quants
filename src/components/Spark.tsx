"use client";
import { useEffect, useState } from "react";

const cache = new Map<string, Promise<Record<string, number[]>>>();
function load(coins: string[]) {
  const key = [...coins].sort().join(",");
  if (!cache.has(key)) cache.set(key, fetch(`/api/spark?coins=${encodeURIComponent(key)}`).then((r) => r.json()).then((j) => j.spark ?? {}).catch(() => ({})));
  return cache.get(key)!;
}

/** Small 24h line chart that always fits its card (scales to the container width). */
export function Spark({ coin, group, height = 36, dark = false }: { coin: string; group: string[]; width?: number; height?: number; dark?: boolean }) {
  const [pts, setPts] = useState<number[]>([]);
  const key = [...group].sort().join(","); // stable dependency: avoids a fetch loop
  useEffect(() => {
    let alive = true;
    load(key.split(",")).then((s) => { if (alive) setPts(s[coin] ?? []); });
    return () => { alive = false; };
  }, [coin, key]);
  if (pts.length < 2) return <div style={{ height }} className={`w-full rounded-lg ${dark ? "bg-forest/40" : "bg-black/[0.04]"}`} aria-hidden />;
  const W = 100;
  const min = Math.min(...pts), max = Math.max(...pts), r = max - min || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * W, height - 3 - ((p - min) / r) * (height - 6)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const up = pts[pts.length - 1] >= pts[0];
  const c = up ? (dark ? "#2EE59D" : "#007D10") : "#E5604D";
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="block w-full overflow-hidden" style={{ height }} role="img" aria-label={`${coin} 24 hour price ${up ? "up" : "down"}`}>
      <path d={`${d} L${W},${height} L0,${height} Z`} fill={c} opacity="0.1" />
      <path d={d} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
