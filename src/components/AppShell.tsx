"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui";

const NAV = [
  ["/app", "Home", "M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5"],
  ["/app/markets", "Markets", "M3 3v18h18M7 15l4-4 3 3 6-7"],
  ["/app/alerts", "Alerts", "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"],
  ["/app/signals", "Signals", "M3 12h4l3-8 4 16 3-8h4"],
  ["/app/track", "Record", "M4 20V10M10 20V4M16 20v-6M22 20H2"],
  ["/app/settings", "Settings", "M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4"],
] as const;

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

export function AppShell({ name, demo, children }: { name: string; demo: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = (h: string) => (h === "/app" ? path === "/app" : path.startsWith(h));
  const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "Q";
  return (
    <div className="canvas min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col justify-between bg-night p-5 text-cream lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div>
          <Link href="/app"><Logo light /></Link>
          <p className="label mt-10 px-3 text-mist">Navigation</p>
          <nav className="mt-2 space-y-1">
            {NAV.map(([h, l, d]) => (
              <Link key={h} href={h} aria-current={active(h) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 font-semibold transition-colors ${active(h) ? "bg-cream text-night" : "text-cream hover:bg-forest"}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active(h) ? "bg-night text-signal" : "bg-[#163a29]"}`}><Icon d={d} className="h-4 w-4" /></span>{l === "Record" ? "Track record" : l}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl bg-[#163a29] p-4">
            <p className="text-sm font-extrabold">Trade from any alert</p>
            <p className="mt-1 text-xs font-semibold text-mist">Swaps settle through NEAR Intents into your own wallet.</p>
          </div>
          <p className="label px-1 text-mist">Account</p>
          <div className="flex items-center gap-3 rounded-2xl border border-forest p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal text-sm font-black text-night">{initials}</span>
            <div className="min-w-0"><p className="truncate text-sm font-bold">{name}</p><p className="text-xs font-semibold text-mist">{demo ? "Demo account" : "Signed in"}</p></div>
          </div>
          <form action="/auth/signout" method="post" className="flex items-center justify-between px-1">
            <button className="text-sm font-semibold text-mist hover:text-cream">Sign out</button>
            <span className="text-xs font-semibold text-mist">Built on NEAR</span>
          </form>
        </div>
      </aside>

      <div className="pb-28 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#edf1ea]/95 px-4 py-3 sm:px-8">
          <Link href="/app" className="lg:hidden"><Logo size={28} /></Link>
          <div className="hidden items-center gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-line lg:flex">
            {NAV.slice(0, 5).map(([h, l]) => <Link key={h} href={h} className={`pill-tab flex items-center ${active(h) ? "on" : "!shadow-none"}`}>{l === "Record" ? "Track record" : l}</Link>)}
          </div>
          <div className="flex items-center gap-2">
            {demo && <span className="chip bg-lime text-night">Demo</span>}
            <Link href="/app/alerts" aria-label="Alerts" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-line"><Icon d={NAV[2][2]} className="h-4 w-4" /></Link>
            <Link href="/app/settings" aria-label="Account" className="flex h-10 w-10 items-center justify-center rounded-full bg-night text-sm font-black text-signal">{initials}</Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-8">{children}</main>
      </div>

      {/* Mobile: floating pill navigation (reference phone screens) */}
      <nav aria-label="Main" className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-full bg-white p-1.5 shadow-[0_18px_40px_-12px_rgba(2,6,14,0.45)] ring-1 ring-line lg:hidden">
        {NAV.map(([h, l, d]) => (
          <Link key={h} href={h} aria-label={l} aria-current={active(h) ? "page" : undefined}
            className={`flex h-11 flex-1 items-center justify-center rounded-full ${active(h) ? "bg-night text-signal" : "text-ink"}`}>
            <Icon d={d} />
          </Link>
        ))}
      </nav>
    </div>
  );
}
