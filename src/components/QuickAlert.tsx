"use client";
// Plain-English alert box: parse on the server, show the parsed rule, the user confirms.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtUsd } from "./ui";

type Rule = { coin: string; kind: string; direction: "above" | "below" | null; price: number | null; percent: number | null; remindAt: string | null };

export function describe(r: Rule): string {
  const when = r.remindAt ? ` at ${new Date(r.remindAt).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "";
  if (r.kind === "reminder") return `Remind me about ${r.coin}${when}${r.direction && r.price ? ` if it is ${r.direction} ${fmtUsd(r.price)}` : ""}`;
  return `Alert me when ${r.coin} goes ${r.direction} ${fmtUsd(r.price)}${r.percent ? ` (${r.percent > 0 ? "+" : ""}${r.percent}% from now)` : ""}`;
}

export function QuickAlert({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [rule, setRule] = useState<Rule | null>(null);
  const [src, setSrc] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const post = (body: object) => fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

  return (
    <section className={compact ? "" : "card p-5"}>
      {!compact && <h2 className="text-lg font-extrabold">Add alert</h2>}
      <form className="mt-3 flex gap-2" onSubmit={async (e) => {
        e.preventDefault(); if (!text.trim()) return;
        setBusy(true); setMsg(""); setRule(null);
        const r = await post({ action: "parse", text, timeZone: tz }).catch(() => ({ error: "Network error" }));
        setBusy(false);
        if (r.rule) { setRule(r.rule); setSrc(r.source); } else setMsg(r.error ?? "Couldn't understand that.");
      }}>
        <label htmlFor="qa" className="sr-only">Describe your alert</label>
        <input id="qa" className="input" placeholder='e.g. "SOL drops 5%" or "BTC above 100k"' value={text} onChange={(e) => setText(e.target.value)} maxLength={280} />
        <button className="btn btn-dark shrink-0" disabled={busy}>{busy ? "…" : "Check"}</button>
      </form>
      {rule && (
        <div className="mt-3 rounded-2xl bg-lime p-4">
          <p className="label text-night">Confirm your alert</p>
          <p className="mt-1 font-bold text-night">{describe(rule)}</p>
          <p className="mt-1 text-xs font-semibold text-night">Read by {src === "ai" ? "NEAR AI" : "Quants' rule parser"}. Repeats up to 3 times until you tap Got it.</p>
          <div className="mt-3 flex gap-2">
            <button className="btn btn-primary h-10" onClick={async () => {
              setBusy(true);
              const r = await post({ action: "create", rule, sourceText: text });
              setBusy(false);
              if (r.id) { setRule(null); setText(""); setMsg("Alert saved."); router.refresh(); } else setMsg(r.error ?? "Could not save");
            }}>Save alert</button>
            <button className="btn btn-ghost h-10" onClick={() => setRule(null)}>Cancel</button>
          </div>
        </div>
      )}
      {msg && <p role="status" className="mt-2 text-sm font-semibold">{msg}</p>}
    </section>
  );
}
