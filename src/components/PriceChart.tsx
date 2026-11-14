"use client";
// Big price chart with time-range pills, hover crosshair and signal levels (entry / stop / target).
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtUsd } from "./ui";

type C = [number, number, number, number, number]; // t, o, h, l, c
const RANGES = ["24h", "7d", "30d"] as const;

export function PriceChart({ coin, levels, dark = false }: { coin: string; levels?: { stop?: number; target?: number; entry?: number }; dark?: boolean }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("24h");
  const [data, setData] = useState<C[]>([]);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const W = 800, H = 280, P = 8;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/chart?coin=${encodeURIComponent(coin)}&range=${range}`).then((r) => r.json()).then((j) => setData(j.candles ?? [])).catch(() => setData([])).finally(() => setLoading(false));
  }, [coin, range]);

  const g = useMemo(() => {
    if (data.length < 2) return null;
    const vals = data.flatMap((k) => [k[2], k[3]]).concat([levels?.stop, levels?.target].filter((x): x is number => !!x && isFinite(x)));
    let min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.08 || max * 0.01; min -= pad; max += pad;
    const x = (i: number) => P + (i / (data.length - 1)) * (W - 2 * P);
    const y = (v: number) => P + (1 - (v - min) / (max - min)) * (H - 2 * P);
    const line = data.map((k, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(k[4]).toFixed(1)}`).join(" ");
    const up = data[data.length - 1][4] >= data[0][4];
    return { x, y, line, up, min, max };
  }, [data, levels?.stop, levels?.target]);

  const stroke = g?.up ? (dark ? "#2EE59D" : "#007D10") : "#E5604D";
  const grid = dark ? "rgba(227,238,212,0.08)" : "#e4e9e1";
  const text = dark ? "#AEC3B0" : "#33433a";
  const h = hover != null ? data[hover] : null;
  const change = data.length > 1 ? ((data[data.length - 1][4] - data[0][4]) / data[0][4]) * 100 : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={`display num text-3xl font-black ${dark ? "text-cream" : "text-ink"}`}>{fmtUsd(h ? h[4] : data.at(-1)?.[4])}</p>
          <p className={`num text-sm font-bold ${change == null ? "" : change >= 0 ? (dark ? "text-signal" : "text-brand") : "text-coral"}`}>
            {h ? new Date(h[0]).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : change == null ? "–" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}% · ${range}`}
          </p>
        </div>
        <div role="tablist" aria-label="Time range" className={`flex gap-1 rounded-full p-1 ${dark ? "bg-[#163a29]" : "bg-paper"}`}>
          {RANGES.map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)}
              className={`h-8 rounded-full px-4 text-xs font-extrabold uppercase ${range === r ? (dark ? "bg-signal text-night" : "bg-night text-cream") : dark ? "text-cream" : "text-ink"}`}>{r}</button>
          ))}
        </div>
      </div>
      <div ref={box} className="relative mt-4" onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { if (!g || !box.current) return; const r = box.current.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1)); setHover(Math.max(0, Math.min(data.length - 1, i))); }}>
        {!g ? (
          <div className={`flex h-[220px] items-center justify-center rounded-2xl text-sm font-semibold sm:h-[280px] ${dark ? "bg-[#163a29] text-mist" : "bg-paper text-ink-2"}`}>{loading ? "Loading chart…" : "Chart unavailable right now"}</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[220px] w-full sm:h-[280px]" preserveAspectRatio="none" role="img" aria-label={`${coin} price, ${range}`}>
            {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke={grid} strokeDasharray="4 6" />)}
            <path d={`${g.line} L${W - P},${H} L${P},${H} Z`} fill={stroke} opacity="0.09" />
            <path d={g.line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {levels?.target && <g><line x1="0" x2={W} y1={g.y(levels.target)} y2={g.y(levels.target)} stroke={dark ? "#2EE59D" : "#007D10"} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" /></g>}
            {levels?.stop && <line x1="0" x2={W} y1={g.y(levels.stop)} y2={g.y(levels.stop)} stroke="#E5604D" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />}
            {h && <><line x1={g.x(hover!)} x2={g.x(hover!)} y1="0" y2={H} stroke={text} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" /><circle cx={g.x(hover!)} cy={g.y(h[4])} r="5" fill={stroke} stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" /></>}
          </svg>
        )}
        {g && (levels?.target || levels?.stop) && (
          <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-1 text-[11px] font-extrabold">
            {levels?.target && <span className={`rounded-full px-2 py-0.5 ${dark ? "bg-signal text-night" : "bg-brand text-white"}`}>Target {fmtUsd(levels.target)}</span>}
            {levels?.stop && <span className="rounded-full bg-coral px-2 py-0.5 text-white">Stop {fmtUsd(levels.stop)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
