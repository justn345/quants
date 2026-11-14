"use client";
// Home "Get alerts" card: the two delivery channels (Telegram + phone) with clear actions and states.
import { useEffect, useState } from "react";
import { Send, Smartphone, Check } from "lucide-react";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const toBytes = (b64: string) => Uint8Array.from(atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

function Row({ icon, title, sub, done, action }: { icon: React.ReactNode; title: string; sub: string; done: boolean; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-paper p-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${done ? "bg-signal text-night" : "bg-night text-signal"}`}>{icon}</span>
      <div className="min-w-0 flex-1"><p className="font-extrabold leading-tight">{title}</p><p className="text-xs font-semibold text-ink-2">{sub}</p></div>
      {done ? <span className="flex h-9 items-center gap-1 rounded-full bg-[#d6f9ea] px-3 text-xs font-extrabold text-[#04563a]"><Check className="h-4 w-4" strokeWidth={3} />On</span> : action}
    </div>
  );
}

export function GetAlertsCard({ telegram }: { telegram: boolean }) {
  const [push, setPush] = useState<"loading" | "on" | "off" | "na">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !KEY) return setPush("na");
      const reg = await navigator.serviceWorker.register("/sw.js");
      setPush((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setPush("na"));
  }, []);

  const connectTelegram = async () => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/telegram/link", { method: "POST" }).then((x) => x.json()).catch(() => ({}));
    if (r.url) window.open(r.url, "_blank", "noopener"); else setMsg(r.error ?? "Could not create link");
    setBusy(false);
  };
  const enablePush = async () => {
    setBusy(true); setMsg("");
    try {
      if ((await Notification.requestPermission()) !== "granted") { setMsg("Notifications are blocked in your browser settings."); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(KEY) });
      const r = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) }).then((x) => x.json());
      if (r.ok) setPush("on"); else setMsg(r.error ?? "Could not turn on");
    } catch { setMsg("This browser can't show notifications. On iPhone, add Quants AI to your Home Screen first."); }
    finally { setBusy(false); }
  };

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between"><h2 className="text-lg font-extrabold">Get your alerts</h2><span className="text-xs font-bold text-ink-2">Never miss the move</span></div>
      <div className="space-y-2">
        <Row icon={<Send className="h-5 w-5" />} title="Telegram" sub={telegram ? "Alerts arrive in @QuantsSignal_Bot" : "Signals and targets, with a Trade button"} done={telegram}
          action={<button className="btn btn-dark h-9 shrink-0 px-4 text-sm" disabled={busy} onClick={connectTelegram}>Connect</button>} />
        {push !== "na" && (
          <Row icon={<Smartphone className="h-5 w-5" />} title="Phone alerts" sub={push === "on" ? "On for this device" : "Pop-up alerts on this device"} done={push === "on"}
            action={<button className="btn btn-primary h-9 shrink-0 px-4 text-sm" disabled={busy || push === "loading"} onClick={enablePush}>Turn on</button>} />
        )}
      </div>
      {msg && <p role="status" className="mt-2 text-xs font-semibold text-coral">{msg}</p>}
    </section>
  );
}
