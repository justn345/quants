"use client";
// Turn phone/desktop notifications on or off for this device.
import { useEffect, useState } from "react";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
function toBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle() {
  const [state, setState] = useState<"loading" | "unsupported" | "off" | "on" | "blocked">("loading");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !KEY) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const turnOn = async () => {
    setMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(KEY) });
      const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) }).then((x) => x.json());
      if (r.ok) { setState("on"); setMsg("Phone alerts are on for this device."); } else setMsg(r.error ?? "Could not turn on");
    } catch { setMsg("Could not turn on notifications on this device."); }
  };
  const turnOff = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await fetch(`/api/push?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" }); await sub.unsubscribe(); }
    setState("off"); setMsg("Phone alerts are off for this device.");
  };

  return (
    <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
      <div className="max-w-xl">
        <h2 className="text-lg font-extrabold">Phone alerts</h2>
        <p className="mt-1 text-sm font-medium text-ink-2">Get the same alerts as Telegram as phone notifications. Tap one to open Quants on that coin. On iPhone, first add Quants to your Home Screen (Share → Add to Home Screen).</p>
        {msg && <p role="status" className="mt-2 text-sm font-semibold">{msg}</p>}
      </div>
      {state === "on" ? <button className="btn btn-ghost" onClick={turnOff}>Turn off on this device</button>
        : state === "off" ? <button className="btn btn-primary" onClick={turnOn}>Turn on phone alerts</button>
        : state === "blocked" ? <span className="chip chip-short">Blocked in browser settings</span>
        : state === "unsupported" ? <span className="chip chip-flat">Not supported on this browser</span>
        : <span className="chip chip-flat">Checking…</span>}
    </section>
  );
}
