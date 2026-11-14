"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { House, ChartCandlestick, Layers, BellRing, Activity, Trophy, History, Settings, UserRound, type LucideIcon } from "lucide-react";
import { Logo } from "./ui";
import { browserClient } from "@/lib/supabase/browser";

type Item = { href: string; label: string; icon: LucideIcon };
const NAV: Item[] = [
  { href: "/app", label: "Home", icon: House },
  { href: "/app/markets", label: "Markets", icon: ChartCandlestick },
  { href: "/app/liquidity", label: "Liquidity map", icon: Layers },
  { href: "/app/signals", label: "Signals", icon: Activity },
  { href: "/app/alerts", label: "Alerts", icon: BellRing },
  { href: "/app/track", label: "Track record", icon: Trophy },
  { href: "/app/activity", label: "Activity", icon: History },
  { href: "/app/settings", label: "Settings", icon: Settings },
];
// Phones: five clear tabs; the rest are reachable from Home and Profile.
const MOBILE: Item[] = [
  { href: "/app", label: "Home", icon: House },
  { href: "/app/markets", label: "Markets", icon: ChartCandlestick },
  { href: "/app/liquidity", label: "Liquidity", icon: Layers },
  { href: "/app/alerts", label: "Alerts", icon: BellRing },
  { href: "/app/settings", label: "Profile", icon: UserRound },
];

export function AppShell({ name, demo, avatar = null, admin = false, tz = "UTC", uid, children }: {
  name: string; demo: boolean; avatar?: string | null; admin?: boolean; tz?: string; uid?: string; children: React.ReactNode;
}) {
  const path = usePathname();
  const active = (h: string) => (h === "/app" ? path === "/app" : path.startsWith(h));
  const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase() || "Q";
  const Avatar = ({ size }: { size: number }) => avatar
    ? <img src={avatar} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
    : <span className="flex items-center justify-center rounded-full bg-signal font-black text-night" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;

  // First visit: save the device's real time zone instead of the UTC default.
  useEffect(() => {
    if (!uid || tz !== "UTC") return;
    try {
      const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (z && z !== "UTC") void browserClient().from("profiles").update({ time_zone: z }).eq("id", uid);
    } catch { /* ignore */ }
  }, [uid, tz]);

  return (
    <div className="canvas min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden flex-col justify-between bg-night p-5 text-cream lg:sticky lg:top-0 lg:flex lg:h-dvh">
        <div>
          <Link href="/app"><Logo light /></Link>
          <p className="label mt-9 px-3 text-mist">Navigation</p>
          <nav className="mt-2 space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={active(href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2 font-semibold transition-colors ${active(href) ? "bg-cream text-night" : "text-cream hover:bg-forest"}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active(href) ? "bg-night text-signal" : "bg-[#163a29] text-mist"}`}><Icon className="h-4 w-4" strokeWidth={2.2} /></span>{label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-3">
          {admin && <Link href="/admin" className="btn btn-primary h-10 w-full text-sm">Admin dashboard</Link>}
          <div className="flex items-center gap-3 rounded-2xl border border-forest p-3">
            <Avatar size={36} />
            <div className="min-w-0"><p className="truncate text-sm font-bold">{name}</p><p className="text-xs font-semibold text-mist">{demo ? "Demo account" : "Signed in"}</p></div>
          </div>
          <form action="/auth/signout" method="post" className="flex items-center justify-between px-1">
            <button className="text-sm font-semibold text-mist hover:text-cream">Sign out</button>
            <span className="text-xs font-semibold text-mist">Built on NEAR</span>
          </form>
        </div>
      </aside>

      <div className="pb-28 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-[#edf1ea] px-4 py-3 sm:px-8">
          <Link href="/app" className="lg:hidden"><Logo size={30} /></Link>
          <span className="hidden lg:block" aria-hidden />
          <div className="flex items-center gap-2">
            {demo && <span className="chip bg-lime text-night">Demo</span>}
            <Link href="/app/activity" aria-label="Activity and notifications" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-line"><BellRing className="h-[18px] w-[18px]" /></Link>
            <Link href="/app/settings" aria-label="Profile and settings" className="overflow-hidden rounded-full ring-2 ring-white"><Avatar size={40} /></Link>
          </div>
        </header>
        {demo && (
          <div className="mx-4 mb-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-night px-4 py-3 text-cream sm:mx-8">
            <p className="text-sm font-bold"><span className="text-signal">Demo mode:</span> nothing real happens. Sign in to use Quants AI for real.</p>
            <form action="/auth/signout" method="post"><button name="switch" value="1" className="btn btn-primary h-9 px-4 text-sm">Sign in</button></form>
          </div>
        )}
        <main className="mx-auto max-w-7xl px-4 pb-8 pt-2 sm:px-8">{children}</main>
      </div>

      {/* Phones: floating pill tab bar with labels */}
      <nav aria-label="Main" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[26px] bg-white p-1.5 shadow-[0_18px_40px_-12px_rgba(2,6,14,0.45)] ring-1 ring-line lg:hidden">
        {MOBILE.map(({ href, label, icon: Icon }) => {
          const on = active(href);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className="flex flex-col items-center gap-0.5 rounded-2xl py-1.5">
              <span className={`flex h-9 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-night text-signal" : "text-ink"}`}><Icon className="h-5 w-5" strokeWidth={on ? 2.4 : 2} /></span>
              <span className={`text-[10.5px] font-bold ${on ? "text-ink" : "text-ink-2"}`}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
