"use client";
import { useEffect, useState } from "react";

const cache = new Map<string, Promise<Record<string, number[]>>>();
function load(coins: string[]) {
  const key = [...coins].sort().join(",");
  if (!cache.has(key)) cache.set(key, fetch(`/api/spark?coins=${encodeURIComponent(key)}`).then((r) => r.json()).then((j) => j.spark ?? {}).catch(() => ({})));
  return cache.get(key)!;
}

/** Small 24h line chart. Green when up over the day, coral when down. */
export function Spark({ coin, group, width = 120, height = 36, dark = false }: { coin: string; group: string[]; width?: number; height?: number; dark?: boolean }) {
  const [pts, setPts] = useState<number[]>([]);
  const key = [...group].sort().join(","); // stable dependency: avoids a fetch loop
  useEffect(() => {
    let alive = true;
    load(key.split(",")).then((s) => { if (alive) setPts(s[coin] ?? []); });
    return () => { alive = false; };
  }, [coin, key]);
  if (pts.length < 2) return <div style={{ width, height }} className={`rounded-lg ${dark ? "bg-forest/40" : "bg-paper"}`} aria-hidden />;
  const min = Math.min(...pts), max = Math.max(...pts), r = max - min || 1;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * width, height - 3 - ((p - min) / r) * (height - 6)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const up = pts[pts.length - 1] >= pts[0];
  const c = up ? (dark ? "#2EE59D" : "#007D10") : "#E5604D";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-label={`${coin} 24 hour price ${up ? "up" : "down"}`} role="img">
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={c} opacity="0.1" />
      <path d={d} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xy[xy.length - 1][0] - 1.5} cy={xy[xy.length - 1][1]} r="2.5" fill={c} />
    </svg>
  );
}
