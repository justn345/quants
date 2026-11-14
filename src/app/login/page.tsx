import Link from "next/link";
import { Logo, Disclaimer } from "@/components/ui";
import { TryDemoButton } from "@/components/TryDemoButton";
import { NearLogin } from "@/components/NearLogin";

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative overflow-hidden bg-night px-6 py-10 text-cream sm:px-12">
        <svg aria-hidden viewBox="0 0 600 200" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-1/2 w-full opacity-30">
          <polyline fill="none" stroke="#2EE59D" strokeWidth="2" points="0,140 60,130 110,150 170,120 220,135 280,160 330,170 370,120 420,90 470,100 520,60 600,40" />
        </svg>
        <Link href="/"><Logo light /></Link>
        <h1 className="display relative mt-16 text-4xl font-black leading-tight sm:text-5xl">Your market alerts,<br />your levels.</h1>
        <ol className="relative mt-10 max-w-md space-y-3">
          {[["1", "Sign in"], ["2", "Pick your coins"], ["3", "Connect Telegram"]].map(([n, t]) => (
            <li key={n} className="flex items-center gap-4 rounded-2xl border border-forest bg-[#123222] p-4">
              <span className="display flex h-10 w-10 items-center justify-center rounded-full bg-signal text-lg font-black text-night">{n}</span>
              <span className="text-lg font-bold">{t}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="display text-3xl font-black">Sign in to Quants</h2>
          <p className="font-medium text-ink-2">No email codes. Pick one:</p>
          <NearLogin />
          <TryDemoButton className="btn btn-primary w-full" />
          <p className="text-sm font-medium text-ink-2">The demo gives you your own pre-filled account. Nothing to set up.</p>
          <hr className="border-line" />
          <Disclaimer />
          <p className="text-sm font-semibold"><Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/risk" className="underline">Risk disclaimer</Link></p>
        </div>
      </section>
    </main>
  );
}
