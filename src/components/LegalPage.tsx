import Link from "next/link";
import { Logo } from "./ui";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-paper">
      <header className="bg-night px-4 py-4 text-cream sm:px-8"><div className="mx-auto max-w-3xl"><Link href="/"><Logo light /></Link></div></header>
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-[17px] font-medium leading-relaxed sm:px-8 [&_h2]:display [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-black">
        <h1 className="display text-4xl font-black">{title}</h1>
        <p className="text-sm font-semibold text-ink-2">Last updated {updated}</p>
        {children}
        <p className="pt-6 text-sm font-semibold"><Link href="/terms" className="underline">Terms</Link> · <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/risk" className="underline">Risk disclaimer</Link> · <Link href="/about" className="underline">About</Link></p>
      </article>
    </main>
  );
}
