"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CoinIcon, fmtUsd } from "./ui";

type A = { id: string; coin: string; kind: string; direction: "above" | "below" | null; price: number | null; remind_at: string | null; status: string; sent_count: number; repeat_max: number; acknowledged_at: string | null; source_text: string | null; fired_price: number | null };

export function AlertList({ alerts }: { alerts: A[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<string | null>(null);
  const [val, setVal] = useState("");
  const [dir, setDir] = useState<"above" | "below">("above");
  const [err, setErr] = useState("");
  const act = async (body: object) => {
    setErr("");
    const r = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => ({ error: "Network error" }));
    if (r.error) setErr(r.error); else { setEdit(null); router.refresh(); }
  };
  if (!alerts.length) return <p className="card p-6 font-medium text-ink-2">No alerts yet.</p>;
  return (
    <section className="card divide-y divide-line">
      {err && <p role="alert" className="p-4 text-sm font-semibold text-coral">{err}</p>}
      {alerts.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <CoinIcon coin={a.coin} size={34} />
            <div className="min-w-0">
              <p className="font-extrabold">{a.coin} <span className="num font-semibold text-ink-2">{a.kind === "reminder" ? `reminder ${a.remind_at ? new Date(a.remind_at).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}${a.price ? ` if ${a.direction} ${fmtUsd(+a.price)}` : ""}` : `${a.direction} ${fmtUsd(a.price ? +a.price : null)}`}</span></p>
              <p className="truncate text-xs font-semibold text-ink-2">{a.source_text ?? ""}{a.status === "fired" ? ` · fired at ${fmtUsd(a.fired_price ? +a.fired_price : null)} · sent ${a.sent_count}/${a.repeat_max}` : ""}</p>
            </div>
          </div>
          {edit === a.id ? (
            <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const p = Number(val); if (p > 0) act({ action: "update", id: a.id, price: p, direction: dir }); }}>
              <select className="input h-10 w-28" value={dir} onChange={(e) => setDir(e.target.value as "above" | "below")} aria-label="Direction"><option value="above">above</option><option value="below">below</option></select>
              <input className="input num h-10 w-32" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-label="New price" />
              <button className="btn btn-primary h-10">Save</button>
              <button type="button" className="btn btn-ghost h-10" onClick={() => setEdit(null)}>Cancel</button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`chip ${a.status === "fired" ? "chip-short" : a.status === "active" ? "chip-long" : "chip-flat"}`}>{a.status === "done" ? "Done" : a.status[0].toUpperCase() + a.status.slice(1)}</span>
              {a.status === "fired" && !a.acknowledged_at && <button className="btn btn-dark h-9 px-3 text-sm" onClick={() => act({ action: "ack", id: a.id })}>Got it</button>}
              {a.kind !== "reminder" && <button className="btn btn-ghost h-9 px-3 text-sm" onClick={() => { setEdit(a.id); setVal(String(a.price ?? "")); setDir(a.direction ?? "above"); }}>Edit</button>}
              {(a.status === "active" || a.status === "paused") && <button className="btn btn-ghost h-9 px-3 text-sm" onClick={() => act({ action: "update", id: a.id, status: a.status === "active" ? "paused" : "active" })}>{a.status === "active" ? "Pause" : "Resume"}</button>}
              <button className="btn btn-ghost h-9 px-3 text-sm text-coral" onClick={() => { if (confirm("Delete this alert?")) act({ action: "delete", id: a.id }); }}>Delete</button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
