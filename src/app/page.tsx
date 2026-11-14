import Link from "next/link";
import { Landing } from "@/components/Landing";
import { Logo, Disclaimer } from "@/components/ui";

export default function Home() {
  return (
    <main className="bg-night text-cream">
      <Landing />
      <footer className="border-t border-forest px-4 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2"><Logo light /><p className="text-sm font-semibold text-mist">Built on NEAR</p></div>
          <nav className="flex flex-wrap gap-5 text-sm font-semibold">
            <Link href="/about">About</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/risk">Risk disclaimer</Link>
          </nav>
        </div>
        <div className="mx-auto mt-6 max-w-6xl"><Disclaimer dark /></div>
      </footer>
    </main>
  );
}
