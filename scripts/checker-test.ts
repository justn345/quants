// Tests for the alert checker, including a load test with many fake alerts.
// Run: npx tsx scripts/checker-test.ts
import { checkAlerts, quietUntil, type AlertRow } from "../src/lib/alerts/checker";

let failed = 0;
const ok = (cond: boolean, name: string) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

const base: Omit<AlertRow, "id" | "user_id" | "coin" | "direction" | "price"> = {
  kind: "price", remind_at: null, note: null, status: "active", repeat_max: 3, repeat_gap_min: 15,
  sent_count: 0, last_sent_at: null, acknowledged_at: null,
};
const now = new Date("2026-11-14T12:00:00Z");
const prefs = { u1: { time_zone: "UTC", quiet_start: null, quiet_end: null }, u2: { time_zone: "UTC", quiet_start: null, quiet_end: null } };

// Two users, different levels on the same coin: each fires only at their own price.
const a75: AlertRow = { ...base, id: "a", user_id: "u1", coin: "SOL", direction: "above", price: 75 };
const a76: AlertRow = { ...base, id: "b", user_id: "u2", coin: "SOL", direction: "above", price: 76 };
let acts = checkAlerts([a75, a76], { SOL: 75.5 }, prefs, now);
ok(acts.length === 1 && acts[0].alert.id === "a", "SOL 75.5: only the $75 alert fires, the $76 one waits");
acts = checkAlerts([a75, a76], { SOL: 76.2 }, prefs, now);
ok(acts.length === 2, "SOL 76.2: both fire, each for its own user");

// A HYPE-only user never gets BTC alerts: alerts are per coin.
const hype: AlertRow = { ...base, id: "h", user_id: "u1", coin: "HYPE", direction: "below", price: 25.07 };
ok(checkAlerts([hype], { BTC: 1, HYPE: 30 }, prefs, now).length === 0, "HYPE above level: no alert");
ok(checkAlerts([hype], { BTC: 1, HYPE: 25 }, prefs, now).length === 1, "HYPE drops to 25: alert fires");

// Paused alerts never fire.
ok(checkAlerts([{ ...a75, status: "paused" }], { SOL: 99 }, prefs, now).length === 0, "Paused alert does not fire");

// Repeat until seen: up to 3 sends, 15 min apart, stops when acknowledged.
const fired: AlertRow = { ...a75, status: "fired", sent_count: 1, last_sent_at: new Date(now.getTime() - 16 * 60_000).toISOString() };
acts = checkAlerts([fired], { SOL: 80 }, prefs, now);
ok(acts[0]?.type === "repeat" && acts[0].dedupeKey === "alert:a:2", "Repeats after 15 min with a new dedupe key");
ok(checkAlerts([{ ...fired, last_sent_at: new Date(now.getTime() - 5 * 60_000).toISOString() }], { SOL: 80 }, prefs, now).length === 0, "No repeat before the gap");
ok(checkAlerts([{ ...fired, acknowledged_at: now.toISOString() }], { SOL: 80 }, prefs, now).length === 0, "\"Got it\" stops repeats");
ok(checkAlerts([{ ...fired, sent_count: 3 }], { SOL: 80 }, prefs, now)[0]?.type === "expire", "Stops after 3 sends");

// Reminders with a condition.
const rem: AlertRow = { ...base, id: "r", user_id: "u1", coin: "BTC", kind: "reminder", direction: "below", price: 95000, remind_at: "2026-11-14T09:00:00Z" };
ok(checkAlerts([rem], { BTC: 90000 }, prefs, now)[0]?.type === "fire", "Reminder fires when time passed and BTC below 95k");
ok(checkAlerts([rem], { BTC: 99000 }, prefs, now)[0]?.type === "expire", "Reminder skipped when BTC is above 95k");
ok(checkAlerts([{ ...rem, remind_at: "2026-11-15T09:00:00Z" }], { BTC: 90000 }, prefs, now).length === 0, "Future reminder waits");

// Quiet hours (overnight 23:00-07:00 in a UTC+1 time zone).
const q = { time_zone: "Europe/Paris", quiet_start: "23:00", quiet_end: "07:00" };
const at = quietUntil(new Date("2026-11-14T01:30:00Z"), q); // 02:30 local
ok(at?.toISOString() === "2026-11-14T06:00:00.000Z", "Quiet hours: queued until 07:00 local");
ok(quietUntil(new Date("2026-11-14T12:00:00Z"), q) === null, "Outside quiet hours: send now");

// Load test: 50,000 alerts across 179 coins.
const coins = Array.from({ length: 179 }, (_, i) => `C${i}`);
const prices: Record<string, number> = Object.fromEntries(coins.map((c) => [c, 100]));
const many: AlertRow[] = Array.from({ length: 50_000 }, (_, i) => ({
  ...base, id: `x${i}`, user_id: `u${i % 5000}`, coin: coins[i % 179], direction: i % 2 ? "above" : "below", price: 90 + (i % 21),
}));
const t0 = performance.now();
const res = checkAlerts(many, prices, {}, now);
const ms = performance.now() - t0;
const expected = many.filter((a) => (a.direction === "above" ? 100 >= a.price! : 100 <= a.price!)).length;
ok(res.length === expected, `Load: 50,000 alerts → ${res.length} fired, matches expected ${expected}`);
ok(ms < 1000, `Load: checked 50,000 alerts in ${ms.toFixed(0)} ms`);

console.log(failed ? `\n${failed} FAILED` : "\nAll checker tests passed");
process.exit(failed ? 1 : 0);
