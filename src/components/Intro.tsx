"use client";
// Landing intro, built in code (canvas), ~2.8s: market-noise particles → a price line that dips then
// breaks upward → the Q → five coins snap into orbit → QUANTS + tagline, with a real loading bar
// driven by the live price request. Click to skip. Full version on first visit only.
import { useEffect, useRef, useState } from "react";

const COINS = ["BTC", "ETH", "SOL", "BNB", "HYPE"];
const DURATION = 2800;

export function Intro({ progress, onDone }: { progress: number; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [t, setT] = useState(0);
  const [mode, setMode] = useState<"full" | "short" | "fade">("full");
  const doneRef = useRef(false);

  const finish = () => { if (!doneRef.current) { doneRef.current = true; onDone(); } };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try { seen = localStorage.getItem("quants_intro") === "1"; localStorage.setItem("quants_intro", "1"); } catch { /* private mode */ }
    const m = reduce ? "fade" : seen ? "short" : "full";
    setMode(m);
    const total = m === "full" ? DURATION : m === "short" ? 600 : 400;
    const c = canvas.current!, ctx = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; };
    resize();
    addEventListener("resize", resize);
    const N = m === "full" ? 220 : 0;
    const parts = Array.from({ length: N }, (_, i) => ({ x: Math.random(), y: Math.random(), k: i / N, s: 0.6 + Math.random() * 1.6 }));
    // Price path: drift, dip, break upward (x 0..1, y 0..1 where smaller = higher).
    const path = (k: number) => {
      const dip = Math.exp(-((k - 0.55) ** 2) / 0.008) * 0.18;
      const brk = k > 0.62 ? (k - 0.62) * 1.1 : 0;
      return 0.52 + Math.sin(k * 18) * 0.025 + dip - brk;
    };
    let raf = 0;
    const t0 = performance.now();
    const draw = (now: number) => {
      const el = now - t0;
      const p = Math.min(1, el / total);
      setT(p);
      const W = c.width, H = c.height;
      ctx.fillStyle = "#02060E";
      ctx.fillRect(0, 0, W, H);
      if (m === "full") {
        const gather = Math.min(1, el / 900), line = Math.min(1, Math.max(0, (el - 500) / 900)), fadeOut = Math.max(0, (el - 1500) / 500);
        const bw = Math.min(W * 0.7, 900 * dpr), bx = (W - bw) / 2, bh = H * 0.5, by = H * 0.2;
        for (const q of parts) {
          const tx = bx + q.k * bw, ty = by + path(q.k) * bh;
          const x = q.x * W + (tx - q.x * W) * gather, y = q.y * H + (ty - q.y * H) * gather;
          ctx.fillStyle = `rgba(46,229,157,${(0.25 + 0.6 * gather) * (1 - fadeOut)})`;
          ctx.fillRect(x, y, q.s * dpr, q.s * dpr);
        }
        if (line > 0 && fadeOut < 1) {
          ctx.strokeStyle = `rgba(46,229,157,${1 - fadeOut})`;
          ctx.lineWidth = 3 * dpr; ctx.lineJoin = "round";
          ctx.beginPath();
          for (let i = 0; i <= 200 * line; i++) { const k = i / 200; const x = bx + k * bw, y = by + path(k) * bh; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
          ctx.stroke();
        }
      }
      if (p < 1) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, []);

  // Close once the animation is done AND prices have loaded (or after a 1.2s grace period).
  useEffect(() => {
    if (t < 1) return;
    if (progress >= 100) { const id = setTimeout(finish, 250); return () => clearTimeout(id); }
    const id = setTimeout(finish, 1200);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, progress]);

  const qIn = mode === "full" ? Math.min(1, Math.max(0, (t * DURATION - 1500) / 500)) : 1;
  const orbit = mode === "full" ? Math.min(1, Math.max(0, (t * DURATION - 1800) / 500)) : 1;
  const word = "QUANTS";
  const letters = mode === "full" ? Math.floor(Math.min(1, Math.max(0, (t * DURATION - 1900) / 600)) * word.length) : word.length;

  return (
    <div role="button" tabIndex={0} aria-label="Skip intro" onClick={finish} onKeyDown={(e) => e.key === "Enter" && finish()}
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-deep text-cream"
      style={{ opacity: mode === "fade" ? 1 - t * 0.2 : 1 }}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <div className="relative flex flex-col items-center" style={{ opacity: qIn, transform: `scale(${0.85 + 0.15 * qIn})` }}>
        <div className="relative h-44 w-44">
          <svg viewBox="0 0 512 512" className="absolute inset-0 m-auto h-24 w-24">
            <circle cx="246" cy="246" r="132" fill="none" stroke="#F2F0E6" strokeWidth="44" />
            <path d="M296 296 L398 398" stroke="#F2F0E6" strokeWidth="44" />
            <path d="M172 296 L232 236 L264 268 L318 214" fill="none" stroke="#2EE59D" strokeWidth="28" />
            <path d="M282 198 L330 198 L330 246" fill="none" stroke="#2EE59D" strokeWidth="28" />
          </svg>
          <div className="absolute inset-0 rounded-full border border-forest" style={{ opacity: orbit }} />
          {COINS.map((c, i) => {
            const a = (i / COINS.length) * Math.PI * 2 - Math.PI / 2 + t * 1.2;
            const r = 88 * orbit;
            return (
              <span key={c} className="absolute left-1/2 top-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-night text-[10px] font-bold text-cream ring-1 ring-forest"
                style={{ transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px))`, opacity: orbit }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://app.hyperliquid.xyz/coins/${c}.svg`} alt={c} className="h-6 w-6 rounded-full bg-white" />
              </span>
            );
          })}
        </div>
        <div className="display mt-4 text-5xl font-black tracking-[0.18em]">
          {word.split("").map((ch, i) => <span key={i} style={{ opacity: i < letters ? 1 : 0.08 }}>{ch}</span>)}
        </div>
        <p className="mt-2 text-lg font-semibold text-mist" style={{ opacity: letters === word.length ? 1 : 0 }}>Never miss the move.</p>
        <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-night">
          <div className="h-full bg-signal transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
        <p className="num mt-2 text-xs font-semibold text-mist">Loading live prices · {Math.round(progress)}%</p>
      </div>
      <span className="absolute bottom-6 text-xs font-semibold text-mist">Click to skip</span>
    </div>
  );
}
