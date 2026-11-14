"use client";
import { useState } from "react";

export function TryDemoButton({ className = "btn btn-primary" }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <span className="inline-flex flex-col">
      <button className={className} disabled={busy} onClick={async () => {
        setBusy(true); setErr("");
        const r = await fetch("/api/demo", { method: "POST" }).then((x) => x.json()).catch(() => ({ error: "Network error" }));
        if (r.redirect) location.href = "/app"; else { setErr(r.error ?? "Demo unavailable"); setBusy(false); }
      }}>{busy ? "Opening demo…" : "Try demo"}</button>
      {err && <span role="alert" className="mt-2 text-sm font-semibold text-coral">{err}</span>}
    </span>
  );
}
