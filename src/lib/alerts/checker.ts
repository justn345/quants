// Personal alert checker: pure maths, never AI. Runs every minute over all active alerts in batches.
// Each alert belongs to one user; the decision for one alert never depends on another user's alert.
import type { Coin } from "../market/coins";

export interface AlertRow {
  id: string;
  user_id: string;
  coin: Coin;
  kind: "price" | "percent" | "reminder";
  direction: "above" | "below" | null;
  price: number | null;
  remind_at: string | null;
  note: string | null;
  status: "active" | "paused" | "fired" | "done";
  repeat_max: number;
  repeat_gap_min: number;
  sent_count: number;
  last_sent_at: string | null;
  acknowledged_at: string | null;
}

export interface UserPrefs { time_zone: string; quiet_start: string | null; quiet_end: string | null }

export type Action =
  | { type: "fire"; alert: AlertRow; price: number; sendAfter: Date; dedupeKey: string }
  | { type: "repeat"; alert: AlertRow; price: number; sendAfter: Date; dedupeKey: string }
  | { type: "expire"; alert: AlertRow; reason: "condition_not_met" | "repeats_done" };

export function crossed(direction: "above" | "below", level: number, price: number): boolean {
  return direction === "above" ? price >= level : price <= level;
}

/** Minutes since midnight in a time zone. Falls back to UTC for an unknown zone. */
function localMinutes(now: Date, tz: string): number {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  }
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

/** If now is inside the user's quiet hours, returns when they end; otherwise null. Handles overnight ranges. */
export function quietUntil(now: Date, prefs: UserPrefs): Date | null {
  if (!prefs.quiet_start || !prefs.quiet_end) return null;
  const s = toMin(prefs.quiet_start), e = toMin(prefs.quiet_end), n = localMinutes(now, prefs.time_zone);
  if (s === e) return null;
  const inside = s < e ? n >= s && n < e : n >= s || n < e;
  if (!inside) return null;
  const wait = (e - n + 1440) % 1440;
  return new Date(now.getTime() + wait * 60_000);
}

/**
 * Decide what to do for a batch of alerts.
 * - active price/percent alerts: fire when the live price crosses the user's own level
 * - active reminders: fire at remind_at (if a price condition is attached, only when it holds)
 * - fired, not acknowledged: repeat up to repeat_max total sends, every repeat_gap_min minutes
 * Messages during quiet hours are queued for when quiet hours end (never dropped).
 */
export function checkAlerts(
  alerts: AlertRow[],
  prices: Record<Coin, number>,
  prefsByUser: Record<string, UserPrefs>,
  now = new Date(),
): Action[] {
  const out: Action[] = [];
  for (const a of alerts) {
    const px = prices[a.coin];
    const prefs = prefsByUser[a.user_id] ?? { time_zone: "UTC", quiet_start: null, quiet_end: null };
    const sendAfter = quietUntil(now, prefs) ?? now;

    if (a.status === "active") {
      if (a.kind === "reminder") {
        if (!a.remind_at || new Date(a.remind_at) > now) continue;
        if (a.direction && a.price != null) {
          if (px == null) continue; // no price this minute: try again next minute
          if (!crossed(a.direction, a.price, px)) { out.push({ type: "expire", alert: a, reason: "condition_not_met" }); continue; }
        }
        out.push({ type: "fire", alert: a, price: px ?? 0, sendAfter, dedupeKey: `alert:${a.id}:1` });
        continue;
      }
      if (px == null || a.direction == null || a.price == null) continue;
      if (crossed(a.direction, a.price, px)) out.push({ type: "fire", alert: a, price: px, sendAfter, dedupeKey: `alert:${a.id}:1` });
      continue;
    }

    if (a.status === "fired" && !a.acknowledged_at) {
      if (a.sent_count >= a.repeat_max) { out.push({ type: "expire", alert: a, reason: "repeats_done" }); continue; }
      const last = a.last_sent_at ? new Date(a.last_sent_at).getTime() : 0;
      if (now.getTime() - last >= a.repeat_gap_min * 60_000) {
        out.push({ type: "repeat", alert: a, price: px ?? 0, sendAfter, dedupeKey: `alert:${a.id}:${a.sent_count + 1}` });
      }
    }
  }
  return out;
}
