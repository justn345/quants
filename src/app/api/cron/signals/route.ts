// Runs every 15 minutes. Computes signals for featured + followed coins, writes the AI reason
// (capped, so cost is flat), notifies followers on signal changes and liquidation magnets,
// and scores past signals after 4h / 24h for the honest track record.
import { adminClient } from "@/lib/supabase/server";
import { isCron, json, siteUrl } from "@/lib/server/guard";
import { FEATURED } from "@/lib/market/coins";
import { fetchAssetCtxs, fetchBook, fetchCandles } from "@/lib/market/hyperliquid";
import { computeSignal, scoreSignal } from "@/lib/market/signals";
import { writeReason } from "@/lib/ai/reason";
import { fetchOneClickTokens, spotMarkets } from "@/lib/trade/oneclick";
import { checkinMessage, magnetMessage, signalMessage } from "@/lib/telegram/format";
import { tradeLink } from "@/lib/server/ref";
import { enqueue } from "@/lib/server/notify";
import { quietUntil } from "@/lib/alerts/checker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_COINS = 25;  // coins computed per cycle (Hyperliquid rate limits)
const AI_CAP = 15;     // AI reasons per cycle → at most 1,440 short calls a day

export async function GET(req: Request) { return POST(req); }

export async function POST(req: Request) {
  if (!isCron(req)) return json({ error: "unauthorized" }, 401);
  const db = adminClient();
  const t0 = Date.now();
  const ctxs = await fetchAssetCtxs();

  // Spot coverage via NEAR Intents (cheap; once per cycle).
  try {
    const spot = spotMarkets(Object.keys(ctxs), await fetchOneClickTokens());
    const rows = Object.keys(ctxs).map((coin) => ({ coin, price: ctxs[coin].markPx, spot_via_intents: spot.has(coin) }));
    await db.from("market_snapshots").upsert(rows, { onConflict: "coin" });
  } catch { /* keep last known coverage */ }

  // Which coins: featured first, then most-followed.
  const { data: wl } = await db.from("watchlist").select("coin").limit(50_000);
  const follows = new Map<string, number>();
  for (const w of wl ?? []) follows.set(w.coin, (follows.get(w.coin) ?? 0) + 1);
  const others = [...follows.entries()].filter(([c]) => !FEATURED.includes(c as never) && ctxs[c]).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const coins = [...FEATURED, ...others].slice(0, MAX_COINS);

  let aiUsed = 0, made = 0;
  for (const coin of coins) {
    if (Date.now() - t0 > 45_000) break;
    try {
      const { data: prev } = await db.from("signals").select("id,direction,factors").eq("coin", coin).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const prevOi = (prev?.factors as { oiUsd?: number } | null)?.oiUsd ?? null;
      const [c15, book] = await Promise.all([fetchCandles(coin, "15m", 24), fetchBook(coin)]);
      const s = computeSignal(coin, ctxs[coin], c15, book, prevOi);
      let reason: { text: string; source: "ai" | "template" };
      if (aiUsed < AI_CAP) {
        reason = await writeReason(s);
        aiUsed++;
        await db.rpc("bump_ai_usage", { p_kind: "reason", p_failed: reason.source === "template" });
      } else {
        reason = { text: (await import("@/lib/market/signals")).templateReason(s), source: "template" };
      }
      const { data: ins } = await db.from("signals").insert({
        coin, direction: s.direction, label: s.label, score: s.score, price: s.price, key_level: s.keyLevel,
        entry_low: s.entryLow, entry_high: s.entryHigh, stop: s.stop, target: s.target,
        reason: reason.text, reason_source: reason.source, factors: { ...s.factors, oiUsd: ctxs[coin].openInterestUsd },
      }).select("id").single();
      made++;

      // Notify followers (only those who follow this coin and turned the type on).
      // "changed" covers new setups AND the edge disappearing (a WAIT message).
      const changed = !!prev && prev.direction !== s.direction;
      const near = [s.factors.magnetAbove, s.factors.magnetBelow].filter(Boolean).sort((a, b) => Math.abs(a!.distancePct) - Math.abs(b!.distancePct))[0];
      const magnetHit = near && Math.abs(near.distancePct) <= 1.0;
      if (changed || magnetHit) {
        const { data: subs } = await db.from("watchlist").select("user_id,notify_signals,notify_magnets").eq("coin", coin);
        const ids = (subs ?? []).map((x) => x.user_id);
        const { data: profs } = ids.length ? await db.from("profiles").select("id,time_zone,quiet_start,quiet_end,max_alerts_per_day").in("id", ids) : { data: [] };
        const since = new Date(); since.setUTCHours(0, 0, 0, 0);
        const chartUrl = `${siteUrl()}/app/signals?coin=${encodeURIComponent(coin)}`;
        const bucket = Math.floor(Date.now() / (4 * 3600_000));
        for (const sub of subs ?? []) {
          const p = profs?.find((x) => x.id === sub.user_id);
          if (!p) continue;
          const { count } = await db.from("notifications").select("id", { count: "exact", head: true })
            .eq("user_id", sub.user_id).in("kind", ["signal", "magnet"]).gte("created_at", since.toISOString());
          if ((count ?? 0) >= p.max_alerts_per_day) continue; // cap applies to signal/magnet only
          const sendAfter = (quietUntil(new Date(), p) ?? new Date()).toISOString();
          const tradeUrl = tradeLink(siteUrl(), coin, sub.user_id);
          if (changed && sub.notify_signals) {
            await enqueue(db, { user_id: sub.user_id, signal_id: ins?.id, kind: "signal", title: s.direction === "none" ? `${coin}: Wait, edge gone` : `${coin}: ${s.label}`, body: reason.text,
              payload: signalMessage(s, reason.text, tradeUrl, chartUrl), dedupe_key: `signal:${ins?.id}:${sub.user_id}`, send_after: sendAfter });
          }
          if (magnetHit && sub.notify_magnets) {
            await enqueue(db, { user_id: sub.user_id, signal_id: ins?.id, kind: "magnet", title: `${coin}: possible ${near!.side === "short_liq" ? "long" : "short"} (liquidity magnet)`, body: `Liquidity stacked near ${near!.price}`,
              payload: magnetMessage({ coin, price: s.price, cluster: near!.price, side: near!.side, distancePct: near!.distancePct, tradeUrl, chartUrl }),
              dedupe_key: `magnet:${coin}:${near!.side}:${bucket}:${sub.user_id}`, send_after: sendAfter });
          }
        }
      }
    } catch { /* one coin failing never stops the others */ }
  }

  // MARKET CHECK every 4 hours: a "wait or act" summary of each user's coins.
  let checkins = 0;
  const nowD = new Date();
  if (nowD.getUTCHours() % 4 === 0 && nowD.getUTCMinutes() < 15) {
    const { data: users } = await db.from("profiles").select("id").eq("notify_checkins", true).not("telegram_chat_id", "is", null).limit(5000);
    const { data: latest } = await db.from("latest_signals").select("coin,price,label,direction");
    const sigMap = new Map((latest ?? []).map((x) => [x.coin, x]));
    const slot = nowD.toISOString().slice(0, 13);
    for (const u of users ?? []) {
      if (Date.now() - t0 > 50_000) break;
      const { data: w } = await db.from("watchlist").select("coin").eq("user_id", u.id).limit(12);
      const rows = (w ?? []).map((x) => sigMap.get(x.coin)).filter(Boolean).map((x) => ({ coin: x!.coin, price: +x!.price, label: x!.label, direction: x!.direction }));
      if (!rows.length) continue;
      await enqueue(db, { user_id: u.id, kind: "checkin", title: rows.some((r) => r.direction !== "none") ? "Market check: setups on your coins" : "Market check: wait",
        body: rows.map((r) => `${r.coin} ${r.direction === "none" ? "wait" : r.label}`).join(", "),
        payload: checkinMessage(rows, `${siteUrl()}/app`), dedupe_key: `checkin:${slot}:${u.id}` });
      checkins++;
    }
  }

  // Score past signals (4h and 24h) against the candles that followed.
  let scored = 0;
  const { data: open } = await db.from("signals").select("id,coin,direction,stop,target,created_at,outcome_4h,outcome_24h")
    .is("outcome_24h", null).lte("created_at", new Date(Date.now() - 4 * 3600_000).toISOString()).order("created_at").limit(40);
  for (const sig of open ?? []) {
    if (Date.now() - t0 > 55_000) break;
    try {
      const start = new Date(sig.created_at).getTime();
      const hours = Math.min(24, (Date.now() - start) / 3600_000);
      const candles = (await fetchCandles(sig.coin, "15m", hours + 0.5)).filter((k) => k.t >= start);
      const s = { direction: sig.direction, stop: +sig.stop, target: +sig.target };
      const upd: Record<string, string> = {};
      if (!sig.outcome_4h) upd.outcome_4h = scoreSignal(s, candles.filter((k) => k.t < start + 4 * 3600_000));
      if (hours >= 24) upd.outcome_24h = scoreSignal(s, candles.filter((k) => k.t < start + 24 * 3600_000));
      if (Object.keys(upd).length) { await db.from("signals").update(upd).eq("id", sig.id); scored++; }
    } catch { /* try next cycle */ }
  }

  return json({ ok: true, coins: coins.length, made, aiUsed, scored, checkins, ms: Date.now() - t0 });
}
