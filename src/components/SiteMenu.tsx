"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const ITEMS = [["How it works", "#how"], ["Features", "#features"], ["About", "#about"], ["FAQ", "#faq"], ["Risk disclaimer", "/risk"]] as const;

/** Menu button with a dropdown (closes on outside click and Escape). */
export function SiteMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);
  return (
    <div ref={ref} className="relative">
      <button aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-full border border-forest bg-[#123222] px-4 text-sm font-bold text-cream hover:bg-forest">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
        Menu
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-forest bg-[#0c2418] p-2 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]">
          {ITEMS.map(([l, h]) => (
            <Link key={h} role="menuitem" href={h} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2.5 font-semibold text-cream hover:bg-forest">
              {l}<span aria-hidden className="text-signal">→</span>
            </Link>
          ))}
          <div className="mt-1 border-t border-forest p-2 text-xs font-semibold text-mist">Built on NEAR</div>
        </div>
      )}
    </div>
  );
}
