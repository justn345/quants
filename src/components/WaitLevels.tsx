// Shown instead of entry/stop/target when there is no clear edge: "Wait" plus the key levels to watch.
import { fmtPrice } from "@/lib/format";

type Cl = { price: number } | null | undefined;
export function WaitLevels({ keyLevel, factors, dark = false }: { keyLevel: number; factors?: Record<string, unknown>; dark?: boolean }) {
  const above = (factors?.magnetAbove as Cl)?.price, below = (factors?.magnetBelow as Cl)?.price;
  const box = dark ? "rounded-xl bg-[#163a29] p-2" : "rounded-xl bg-paper p-2";
  return (
    <div>
      <p className={`text-sm font-extrabold ${dark ? "text-cream" : "text-ink"}`}>Wait. No clear edge right now; watch these levels:</p>
      <dl className="num mt-2 grid grid-cols-3 gap-2 text-sm">
        <div className={box}><dt className="label">Key level</dt><dd className="truncate font-bold">{fmtPrice(keyLevel)}</dd></div>
        <div className={box}><dt className="label">Stack above</dt><dd className="truncate font-bold text-coral">{above ? fmtPrice(above) : "–"}</dd></div>
        <div className={box}><dt className="label">Stack below</dt><dd className="truncate font-bold text-brand">{below ? fmtPrice(below) : "–"}</dd></div>
      </dl>
    </div>
  );
}
