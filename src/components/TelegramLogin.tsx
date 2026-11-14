"use client";
// Inside Telegram only: signs the user in automatically with their linked Telegram account
// (verified initData), with a button as a fallback. Outside Telegram this renders nothing.
import Script from "next/script";
import { useCallback, useRef, useState } from "react";

type TgWebApp = { initData?: string; ready?: () => void; expand?: () => void };
const tgApp = () => (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;

export function TelegramLogin() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const tried = useRef(false);

  const login = useCallback(async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/auth/telegram", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tgApp()?.initData ?? "" }),
    }).then((x) => x.json()).catch(() => ({ error: "Network error. Try again." }));
    if (r.redirect) { location.replace(r.redirect); return; }
    setErr(r.error ?? "Sign-in failed"); setBusy(false);
  }, []);

  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive"
        onLoad={() => {
          const w = tgApp();
          if (!w?.initData) return;
          w.ready?.(); w.expand?.(); setShow(true);
          if (!tried.current) { tried.current = true; void login(); } // one automatic try
        }} />
      {show && (
        <div>
          <button className="btn w-full bg-[#2AABEE] text-white hover:bg-[#229ED9]" disabled={busy} onClick={login}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden><path d="M9.78 15.17l-.4 4.26c.57 0 .82-.25 1.12-.54l2.68-2.56 5.56 4.07c1.02.56 1.75.27 2.02-.94l3.66-17.15c.33-1.51-.54-2.1-1.53-1.73L1.4 9.06c-1.47.57-1.45 1.39-.25 1.76l5.5 1.71L19.4 4.5c.6-.4 1.15-.18.7.22" /></svg>
            {busy ? "Signing you in with Telegram…" : "Continue with Telegram"}
          </button>
          {err && <p role="alert" className="mt-2 text-sm font-semibold text-coral">{err}</p>}
        </div>
      )}
    </>
  );
}
