import Link from "next/link";
import { Logo, Disclaimer } from "@/components/ui";
import { TryDemoButton } from "@/components/TryDemoButton";
import { NearLogin } from "@/components/NearLogin";
import { GoogleLogin } from "@/components/GoogleLogin";
import { TelegramLogin } from "@/components/TelegramLogin";
import { CoinIcon } from "@/components/CoinIcon";

export default function LoginPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-deep px-4 py-8 text-cream sm:px-8">
      {/* Faint live-price line behind everything */}
      <svg aria-hidden viewBox="0 0 600 200" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 w-full opacity-25">
        <polyline fill="none" stroke="#2EE59D" strokeWidth="2" points="0,140 60,130 110,150 170,120 220,135 280,160 330,170 370,120 420,90 470,100 520,60 600,40" />
      </svg>
      <div className="relative mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/"><Logo light /></Link>
        <Link href="/" className="text-sm font-bold text-mist hover:text-cream">← Back home</Link>
      </div>

      <div className="relative mx-auto mt-10 grid max-w-6xl items-center gap-10 lg:mt-16 lg:grid-cols-[1fr_440px]">
        <section>
          {/* Floating coin tiles (reference: icon tiles above the title) */}
          <div className="flex items-end gap-3">
            {["BTC", "HYPE", "SOL"].map((c, i) => (
              <span key={c} className={`flex items-center justify-center rounded-2xl border border-forest bg-night shadow-[0_18px_36px_-16px_rgba(0,0,0,0.8)] ${i === 1 ? "h-20 w-20" : "h-14 w-14 " + (i ? "rotate-6" : "-rotate-6")}`}>
                <CoinIcon coin={c} size={i === 1 ? 44 : 30} />
              </span>
            ))}
          </div>
          <h1 className="display mt-8 text-5xl font-black leading-[0.95] sm:text-6xl">Your market alerts,<br /><span className="text-signal">your levels.</span></h1>
          <ol className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
            {[["1", "Sign in"], ["2", "Pick your coins"], ["3", "Connect Telegram"]].map(([n, t]) => (
              <li key={n} className="panel-dark flex items-center gap-3 p-4">
                <span className="display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal font-black text-night">{n}</span>
                <span className="font-bold">{t}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="glass p-6 sm:p-8">
          <h2 className="display text-3xl font-black">Sign in to Quants AI</h2>
          <p className="mt-1 font-medium text-mist">Never miss the move. No email codes, no passwords.</p>
          <div className="mt-6 space-y-3">
            <TelegramLogin />
            <GoogleLogin />
            <TryDemoButton className="btn btn-primary w-full" />
            <p className="text-sm font-medium text-mist">The demo opens your own pre-filled account. Nothing to set up.</p>
          </div>
          <div className="my-5 flex items-center gap-3"><hr className="flex-1 border-forest" /><span className="label text-mist">Optional</span><hr className="flex-1 border-forest" /></div>
          <NearLogin />
          <div className="mt-6 border-t border-forest pt-4">
            <Disclaimer dark />
            <p className="mt-2 text-sm font-semibold"><Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/risk" className="underline">Risk disclaimer</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
