"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui";

const NAV = [
  ["/app", "Dashboard", "M3 12l9-9 9 9M5 10v10h14V10"],
  ["/app/alerts", "Alerts", "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"],
  ["/app/signals", "Signals", "M3 17l6-6 4 4 8-8M14 7h7v7"],
  ["/app/track", "Track record", "M4 20V10M10 20V4M16 20v-6M22 20H2"],
  ["/app/settings", "Settings", "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z"],
] as const;

function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

export function AppShell({ name, demo, children }: { name: string; demo: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = (h: string) => (h === "/app" ? path === "/app" : path.startsWith(h));
  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden flex-col justify-between bg-night p-5 text-cream lg:flex lg:sticky lg:top-0 lg:h-dvh">
        <div>
          <Link href="/app"><Logo light /></Link>
          <nav className="mt-10 space-y-1">
            {NAV.map(([h, l, d]) => (
              <Link key={h} href={h} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold ${active(h) ? "bg-lime text-night" : "hover:bg-forest"}`}>
                <Icon d={d} />{l}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-forest p-3">
            <p className="truncate font-bold">{name}</p>
            <p className="text-xs font-semibold text-mist">{demo ? "Demo account" : "Signed in"}</p>
          </div>
          <form action="/auth/signout" method="post"><button className="text-sm font-semibold text-mist hover:text-cream">Sign out</button></form>
          <p className="text-xs font-semibold text-mist">Built on NEAR</p>
        </div>
      </aside>
      <div className="pb-24 lg:pb-0">
        <header className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 lg:hidden">
          <Link href="/app"><Logo /></Link>
          {demo && <span className="chip bg-lime text-night">Demo</span>}
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-forest bg-night text-cream lg:hidden">
        {NAV.map(([h, l, d]) => (
          <Link key={h} href={h} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${active(h) ? "text-signal" : "text-cream"}`}>
            <Icon d={d} />{l.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
