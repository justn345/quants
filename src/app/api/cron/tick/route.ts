// Runs every minute (Supabase pg_cron -> this URL with the cron secret).
// 1) one Hyperliquid fetch for everyone -> market_snapshots
// 2) check every user's own alerts with pure maths -> outbox
// 3) send queued Telegram messages
import { adminClient } from "@/lib/supabase/server";
import { isCron, json, siteUrl } from "@/lib/server/guard";
import { fetchAssetCtxs } from "@/lib/market/hyperliquid";
import { checkAlerts, type AlertRow, type UserPrefs } from "@/lib/alerts/checker";
import { priceAlertMessage } from "@/lib/telegram/format";
import { drainOutbox, enqueue } from "@/lib/server/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) { return POST(req); }

export async function POST(req: Request) {
  if (!isCron(req)) return json({ error: "unauthorized" }, 401);
  const db = adminClient();
  const ctxs = await fetchAssetCtxs();
  const now = new Date();

  const rows = Object.values(ctxs).map((c) => ({
    coin: c.coin, price: c.markPx, change_24h_pct: c.change24hPct, funding: c.funding,
    open_interest_usd: c.openInterestUsd, volume_24h_usd: c.dayVolumeUsd, max_leverage: c.maxLeverage,
    sz_decimals: c.szDecimals, updated_at: now.toISOString(),
  }));
  await db.from("market_snapshots").upsert(rows, { onConflict: "coin" });
  const prices: Record<string, number> = Object.fromEntries(Object.values(ctxs).map((c) => [c.coin, c.midPx]));

  // Alerts in batches of 1000 (indexed by status).
  let fired = 0, repeats = 0;
  for (let from = 0; ; from += 1000) {
    const { data: batch } = await db
      .from("alerts")
      .select("id,user_id,coin,kind,direction,price,remind_at,note,status,repeat_max,repeat_gap_min,sent_count,last_sent_at,acknowledged_at")
      .or("status.eq.active,and(status.eq.fired,acknowledged_at.is.null)")
      .order("id")
      .range(from, from + 999);
    if (!batch?.length) break;
    const users = [...new Set(batch.map((a) => a.user_id))];
    const { data: profs } = await db.from("profiles").select("id,time_zone,quiet_start,quiet_end").in("id", users);
    const prefs: Record<string, UserPrefs> = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
    const coins = [...new Set(batch.map((a) => a.coin))];
    const { data: sigs } = await db.from("latest_signals").select("coin,label,key_level,entry_low,entry_high,stop,target,reason").in("coin", coins);
    const sigBy = new Map((sigs ?? []).map((s) => [s.coin, s]));

    for (const act of checkAlerts(batch as AlertRow[], prices, prefs, now)) {
      const a = act.alert;
      if (act.type === "expire") { await db.from("alerts").update({ status: "done" }).eq("id", a.id); continue; }
      const sendNumber = a.sent_count + 1;
      const s = sigBy.get(a.coin);
      const msg = priceAlertMessage({
        coin: a.coin, direction: a.direction, level: a.price, price: act.price, note: a.note, sendNumber,
        repeatMax: a.repeat_max, alertId: a.id, tradeUrl: `${siteUrl()}/trade/${encodeURIComponent(a.coin)}?a=${a.id}`,
        signal: s ? { label: s.label, keyLevel: +s.key_level, entryLow: +s.entry_low, entryHigh: +s.entry_high, stop: +s.stop, target: +s.target, reason: s.reason } : null,
      });
      await enqueue(db, {
        user_id: a.user_id, alert_id: a.id, kind: a.kind === "reminder" ? "reminder" : "price",
        title: a.direction && a.price ? `${a.coin} ${a.direction} ${a.price}` : `Reminder: ${a.coin}`,
        body: `Price ${act.price}`, payload: msg, dedupe_key: act.dedupeKey, send_after: act.sendAfter.toISOString(),
      });
      await db.from("alerts").update({
        status: "fired", sent_count: sendNumber, last_sent_at: now.toISOString(),
        ...(act.type === "fire" ? { fired_at: now.toISOString(), fired_price: act.price } : {}),
      }).eq("id", a.id);
      if (act.type === "fire") fired++; else repeats++;
    }
    if (batch.length < 1000) break;
  }

  const sent = await drainOutbox(db, 35_000);
  return json({ ok: true, coins: rows.length, fired, repeats, ...sent });
}
