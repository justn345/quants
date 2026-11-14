// One price format for web, Telegram and AI text: thousands separators and the coin's normal precision.
// $66,795 · $1,820.68 · $66.98 · $3.01 · $0.1249 · $0.004458
export function fmtPrice(p: number | null | undefined): string {
  if (p == null || !isFinite(p)) return "–";
  const a = Math.abs(p);
  const d = a >= 10_000 ? 0 : a >= 1 ? 2 : a >= 0.01 ? 4 : 6;
  return "$" + p.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** Rewrites raw numbers near the coin's price (e.g. 3.01374, $66795.2) into the standard price format. */
export function tidyPrices(text: string, refPrice: number): string {
  if (!refPrice) return text;
  return text.replace(/\$?\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b|\$?\b\d+(?:\.\d+)?\b/g, (m) => {
    const n = Number(m.replace(/[$,]/g, ""));
    if (!isFinite(n) || n <= 0) return m;
    const ratio = n / refPrice;
    // Only treat it as a price if it's within a plausible band around the current price.
    return ratio > 0.5 && ratio < 2 ? fmtPrice(n) : m;
  });
}
