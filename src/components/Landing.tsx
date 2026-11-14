"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Intro } from "./Intro";
import { CoinIcon, Logo, Pct, fmtUsd } from "./ui";
import { TryDemoButton } from "./TryDemoButton";
import { SiteMenu } from "./SiteMenu";

type Snap = { coin: string; price: number; change_24h_pct: number; spot_via_intents: boolean };
const STRIP = ["BTC", "ETH", "SOL", "BNB", "HYPE"];

export function Landing() {
  const [intro, setIntro] = useState(true);
  const [progress, setProgress] = useState(5);
  const [coins, setCoins] = useState<Snap[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let p = 5;
    const tick = setInterval(() => { p = Math.min(90, p + 7); setProgress(p); }, 120);
    fetch("/api/prices").then((r) => r.json()).then((j) => {
      setCoins(j.coins ?? []); setTotal((j.coins ?? []).length);
    }).catch(() => {}).finally(() => { clearInterval(tick); setProgress(100); });
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("in")), { threshold: 0.15 });
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => { clearInterval(tick); io.disconnect(); };
  }, []);

  const strip = STRIP.map((c) => coins.find((x) => x.coin === c)).filter(Boolean) as Snap[];

  return (
    <>
      {intro && <Intro progress={progress} onDone={() => setIntro(false)} />}
      <header className="sticky top-0 z-30 border-b border-forest bg-night/95 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Logo light />
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-primary h-10">Sign in</Link>
            <SiteMenu />
          </div>
        </div>
      </header>

      <section className="px-4 pb-16 pt-16 sm:px-8 sm:pt-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="chip bg-lime text-night">AI market alerts · 170+ coins</p>
            <h1 className="display mt-5 text-5xl font-black leading-[0.95] sm:text-7xl">Never miss<br />the move.</h1>
            <p className="mt-6 max-w-xl text-lg font-medium text-mist">
              Quants watches the market for you. Clear long/short signals, alerts at your own price levels on Telegram, and a one-tap trade that settles in your own wallet.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <TryDemoButton className="btn btn-primary h-12 px-6 text-base" />
              <Link href="/login" className="btn btn-ghost h-12 px-6 text-base text-cream">Sign in</Link>
            </div>
          </div>
          <div className="glass p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="label text-mist">Alert · Telegram</span><span className="chip chip-long">▲ Leaning long</span>
            </div>
            <p className="display mt-4 text-2xl font-extrabold">HYPE is above $25.07</p>
            <p className="num mt-1 text-mist">Now $25.31 · Entry $25.10–25.25 · Stop $24.60 · Target $26.40</p>
            <p className="mt-4 text-sm text-cream">Trend is up and estimated short liquidations sit near $26.40.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <span className="btn btn-primary">Trade</span><span className="btn btn-ghost text-cream">Got it</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Live prices" className="border-y border-forest bg-[#0c2418] px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto">
          {(strip.length ? strip : STRIP.map((c) => ({ coin: c, price: NaN, change_24h_pct: NaN }) as Snap)).map((c) => (
            <div key={c.coin} className="flex shrink-0 items-center gap-3 pr-2">
              <CoinIcon coin={c.coin} size={30} />
              <div><p className="text-sm font-bold">{c.coin}</p><p className="num text-sm text-mist">{fmtUsd(c.price)} <Pct v={c.change_24h_pct} /></p></div>
            </div>
          ))}
          {total > 5 && <span className="shrink-0 self-center text-sm font-semibold text-mist">+ {total - 5} more coins</span>}
        </div>
      </section>

      <section id="how" className="px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="display reveal text-4xl font-black sm:text-5xl">How it works</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["1", "Pick coins, set levels", "Follow BTC, HYPE or any of 170+ coins. Type \"SOL drops 5%\" or \"BTC above 100k\"."],
              ["2", "Get your alert on Telegram", "Only for the coins and alert types you turned on. It repeats until you tap Got it."],
              ["3", "Tap Trade", "Swap through NEAR Intents straight to your own wallet, or open the coin on Hyperliquid with the levels pre-filled."],
            ].map(([n, t, d]) => (
              <div key={n} className="panel-dark reveal p-6">
                <span className="display text-5xl font-black text-signal">{n}</span>
                <h3 className="mt-4 text-xl font-extrabold">{t}</h3>
                <p className="mt-2 font-medium text-mist">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-cream px-4 py-20 text-ink sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="display reveal text-4xl font-black sm:text-5xl">Clear signals. Personal alerts.</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Signals every 15 minutes", "Funding, open interest, order-book walls, trend and estimated liquidations, combined into Leaning long, Leaning short or No clear edge."],
              ["Liquidation magnet alerts", "A heads-up when price gets close to an estimated cluster of liquidations, only for coins you follow."],
              ["Personal price reminders", "Any coin, any price, above or below. Time reminders in your own time zone. Quiet hours and a daily cap."],
              ["Honest track record", "Every signal is scored after 4h and 24h: hit target, hit stop or neither. The real hit rate, even when it's low."],
              ["Telegram with a Trade button", "Readable alerts with levels, reason and a one-tap Trade button that opens inside Telegram."],
              ["Private AI on NEAR", "Market summaries and plain-English alert parsing run on NEAR AI Cloud. Your funds never touch Quants."],
            ].map(([t, d]) => (
              <div key={t} className="card lift reveal p-6">
                <h3 className="text-lg font-extrabold">{t}</h3>
                <p className="mt-2 font-medium text-ink-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="px-4 py-20 sm:px-8">
        <div className="reveal mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
          <h2 className="display text-4xl font-black sm:text-5xl">About Quants</h2>
          <div className="space-y-4 text-lg font-medium text-mist">
            <p>Quants is an AI market agent that tells you when to act before the move passes. It reads public Hyperliquid market data once a minute for everyone, writes one short analysis per coin every 15 minutes, and alerts each person only about what they chose.</p>
            <p><b className="text-cream">Built on NEAR.</b> Spot trades settle through NEAR Intents into your own wallet: Quants never holds funds. Analysis runs on NEAR AI Cloud. You can sign in with a NEAR wallet.</p>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t border-forest px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="display reveal text-4xl font-black">FAQ</h2>
          {[
            ["Is this financial advice?", "No. Signals are estimates from public market data and are not guaranteed. Always do your own research."],
            ["Does Quants hold my money?", "Never. Swaps go from your wallet through NEAR Intents to your own receiving address. Leverage opens in your own Hyperliquid account."],
            ["Which coins?", "BTC, ETH, SOL, BNB and HYPE are featured, plus every coin listed on Hyperliquid (170+). About 46 can be swapped through NEAR Intents."],
            ["What does it cost?", "Nothing to use. NEAR Intents charges its own small swap fee."],
          ].map(([q, a]) => (
            <details key={q} className="reveal border-b border-forest py-5">
              <summary className="cursor-pointer text-lg font-bold">{q}</summary>
              <p className="mt-2 font-medium text-mist">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
