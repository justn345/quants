"use client";
import { useState } from "react";

export function TelegramConnect({ connected }: { connected: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (connected) return <span className="chip chip-long h-9 px-4 text-sm">● Telegram connected</span>;
  return (
    <div className="flex flex-col items-end">
      <button className="btn btn-dark" disabled={busy} onClick={async () => {
        setBusy(true); setErr("");
        const r = await fetch("/api/telegram/link", { method: "POST" }).then((x) => x.json()).catch(() => ({}));
        if (r.url) window.open(r.url, "_blank", "noopener"); else setErr(r.error ?? "Could not create link");
        setBusy(false);
      }}>{busy ? "Creating link…" : "Connect Telegram"}</button>
      <span className="mt-1 text-xs font-semibold text-ink-2">One tap. The link expires in 10 minutes.</span>
      {err && <span role="alert" className="text-sm font-semibold text-coral">{err}</span>}
    </div>
  );
}
