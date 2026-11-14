# Quants: AI market alerts and trading signals, built on NEAR

**Live demo:** https://quants-vert.vercel.app · **Telegram bot:** [@QuantsSignal_Bot](https://t.me/QuantsSignal_Bot) · Built for NEAR HACKATHON (Nov 2026) · Tracks: `defi`, `agents`, `privacy`

Quants is an AI market agent that tells you when to act before the move passes. It watches BTC, ETH, SOL, BNB, HYPE and every other coin listed on Hyperliquid (179 today). It gives basic, clearly labelled long/short signals, alerts each user **only** about the coins and alert types they chose, and lets them trade straight from the alert **without Quants ever holding their funds**.

> Not financial advice. Do your own research. Signals are estimates and are not guaranteed.

## The problem

Retail traders miss moves because they can't watch charts all day. Price-alert apps send generic blasts, signal channels are opaque about their hit rate, and acting on an alert means juggling several apps and handing funds to a custodian.

## What it does

| Feature | How it works |
|---|---|
| Personal price alerts | "HYPE at $25.07" or plain English like "tell me if SOL drops 5% from now". A rule parser handles common phrasing; **NEAR AI** parses the rest. The parsed rule is shown for confirmation. Any coin, any price, above/below, edit/pause/delete. |
| Reminders | "remind me tomorrow at 9am if BTC is below 95k", in the user's own time zone. |
| Repeat until seen | A fired alert re-sends up to 3 times (gap configurable, default 15 min) until the user taps **Got it** in Telegram or the dashboard. |
| Signals (every 15 min) | Funding rate (contrarian), open-interest change, order-book walls within 1%, EMA trend and **estimated** liquidation clusters (modelled from OI at 10x/25x/50x/100x). Output: Leaning long / Leaning short / No clear edge, key level, entry zone, stop, target, and a 2-line reason written by **NEAR AI**. |
| Liquidation magnet alerts | Only for users following that coin, when price is within 1% of an estimated cluster. |
| Honest track record | Every long/short signal is scored after 4h and 24h (hit target / hit stop / neither). If both are touched in one candle it counts as a stop. The real hit rate is shown, even when low. |
| Telegram | One-tap deep link with a one-time, 10-minute code. Readable alerts with levels, reason, disclaimer, a **Trade** button (Telegram Mini App) and **Got it**. `/ask` answers questions from stored data via NEAR AI (20/day cap). |
| Markets | Every Hyperliquid coin (179) with price, 24h change, volume, open interest, search, filters (spot via NEAR Intents, gainers, losers), follow star, and a big chart per coin (24H/7D/30D) with the signal's stop/target drawn on it. |
| Trade page | Spot buy/sell through **NEAR Intents** (1Click API) to the user's own address; leverage via a Hyperliquid deep link with the signal's side/entry/stop/target ready to copy. |
| Per-user control | Watchlist with per-coin switches (signals / magnets / price alerts), quiet hours, max signal alerts per day, export data, delete account. |

## How NEAR is used

1. **NEAR Intents (non-custodial trading).** The trade page requests quotes from the 1Click API (`POST /v0/quote`, `dry: true` for price checks), shows the quote-specific deposit address, and polls `GET /v0/status`. Funds go from the user's wallet to the Intents deposit address and settle to the user's own receiving address on the destination chain; Quants never holds funds. The token list is checked live (`GET /v0/tokens`): 46 of the 179 Hyperliquid coins are spot-tradable via Intents; others get a "Trade on Hyperliquid" path (which users can fund with USDC via Intents too). Receiving and refund addresses are validated per chain before any quote. App fee support is wired (`ONECLICK_APP_FEE_BPS`, default 0). Code: [`src/lib/trade/oneclick.ts`](src/lib/trade/oneclick.ts), [`src/app/api/trade`](src/app/api/trade).
2. **NEAR AI Cloud (private analysis).** All AI runs on NEAR AI Cloud (`https://cloud-api.near.ai/v1`, OpenAI-compatible) with an open-weights model (`Qwen/Qwen3.6-35B-A3B-FP8`). Used for: the 2-line signal reason, plain-English alert parsing, and Telegram `/ask`. No other AI provider is used. Code: [`src/lib/ai`](src/lib/ai).
3. **NEAR wallet login (optional).** Users can sign in by signing a NEP-413 message with any NEAR wallet via `@hot-labs/near-connect`: no transaction, no gas. The server checks the ed25519 signature over the NEP-413 payload, a stateless 5-minute HMAC nonce, and that the public key is a **full-access key** of the account via NEAR RPC `view_access_key`. Code: [`src/lib/near/verify.ts`](src/lib/near/verify.ts).

## Try it (do X → see Y)

1. Open https://quants-vert.vercel.app → a ~3s coded intro (particles → price line → Q logo with 5 coins in orbit) then the landing page with live prices.
2. Click **Try demo** → you get **your own** fresh demo account (anonymous Supabase user) pre-filled with 5 alerts and a watchlist. See the dashboard: live prices, a signal card per coin (direction, key level, entry/stop/target, NEAR AI reason, liquidation-magnet gauge).
3. In **Add alert**, type `tell me if SOL drops 5% from now` → click **Check** → see the parsed rule → **Save alert**. Try `remind me tomorrow at 9am if BTC is below 95k` (parsed by NEAR AI).
4. Go to **Alerts** → edit a price (e.g. change the level), pause, resume or delete it.
5. Click **Connect Telegram** → opens @QuantsSignal_Bot with a one-time code → bot replies "Connected". Try `/alerts` and `/ask what's the setup on SOL?`.
6. Click **Trade** on any signal card (e.g. SOL) → choose Buy, pay with USDC on Base, enter an amount and your own addresses → **Check price** shows a live NEAR Intents quote (dry, nothing moves). **Get deposit address** creates a real quote with a deposit address; nothing happens unless you send funds yourself.
7. Open **Track record** → each dot is a signal scored after 4h; hit rate is shown honestly.
8. **Settings** → add any coin (e.g. `XRP`), toggle per-coin alert types, set quiet hours, export or delete your data.

## Architecture

```
Supabase pg_cron ──(every 1 min, secret from Vault)──▶ /api/cron/tick
   one Hyperliquid fetch for all users → market_snapshots
   per-user alert check (pure maths) → notifications outbox → Telegram (rate-limited, idempotent)
Supabase pg_cron ──(every 15 min)──▶ /api/cron/signals
   signals for featured + followed coins → NEAR AI reason (≤15/cycle) → notify followers
   score signals at 4h / 24h → track record
Telegram ──(secret-token webhook)──▶ /api/telegram/webhook   (/start code, Got it, /alerts, /ask …)
Browser ─▶ Next.js on Vercel ─▶ Supabase (Postgres + Auth, RLS on every table)
Trade page ─▶ /api/trade/quote ─▶ NEAR Intents 1Click API
```

- **Flat AI cost:** reasons are written once per coin per 15-minute cycle (max 15 coins → ≤1,440 short calls/day), never per user. Price alerts are pure maths. If NEAR AI fails, signals still work and the reason falls back to a template sentence. A daily AI-call counter is on `/admin`.
- **Scale:** market data fetched once a minute for everyone; alerts checked in batches of 1,000 with partial indexes; the checker handles 50,000 alerts in ~0.12 s (`scripts/checker-test.ts`); Telegram sends go through an outbox with a unique `dedupe_key` and an atomic claim, so nothing is sent twice.

## Security

- Secrets only in `.env.local` (git-ignored), Vercel env vars and Supabase Vault. `.env.example` has empty placeholders.
- Row Level Security on every table; users can only read/change their own alerts, settings and history. Column-level grants stop users from changing admin flags, Telegram ids or alert send counters. The service-role key is server-only.
- Telegram webhook verified with a secret token (constant-time compare); account linking uses one-time, hashed, 10-minute codes.
- All input validated server-side with Zod (coins checked against the live universe, prices, amounts, per-chain address formats). User text sent to NEAR AI is sanitised, framed as untrusted data, and the AI output is validated against a strict schema; AI never runs code or touches other users' data.
- No seed phrases or private keys are ever requested or stored. Quotes come only from the official 1Click API over HTTPS.
- Per-user and per-IP rate limits for abusers only; demo accounts are per-visitor and IP-limited; `/ask` capped at 20/day.
- GitHub secret scanning and push protection are on.
- See [SECURITY-REPORT.md](SECURITY-REPORT.md).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev
```

Database: `supabase/migrations/*.sql` (tables + RLS, helpers, pg_cron jobs). Tests: `npx tsx scripts/checker-test.ts`, `npx tsx scripts/signals-smoke.ts`, `npx tsx scripts/quote-test.ts` (dry quotes only).

## Stack and credits

Next.js 15, Tailwind 4, Supabase (Postgres, Auth, pg_cron, pg_net, Vault), Vercel, Zod, `@hot-labs/near-connect`, `@noble/curves`. Market data: Hyperliquid public info API. Swaps: NEAR Intents 1Click API. AI: NEAR AI Cloud. All code was written during the hackathon window (first commit 13 Nov 2026), with AI assistance (Claude Code).

## License

MIT, see [LICENSE](LICENSE).
