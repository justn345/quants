# Decisions log

Short notes on choices made while building, so you can review them later.

## 13 Nov 2026
- **Pasted key was not a NEAR AI key.** It is a NEAR Builders directory (MCP) key; NEAR AI Cloud returned 401. Stored in `.env.local` as `NEAR_BUILDERS_MCP_KEY`. `NEAR_AI_API_KEY` is still needed. The guide's request to create a builder profile was not acted on (not part of the build).
- **NEAR AI**: base URL `https://cloud-api.near.ai/v1` (from docs.near.ai, checked against `/v1/models`). Model `Qwen/Qwen3.6-35B-A3B-FP8`: small, cheap, open-weights, about 100 tokens per reason; changeable via `NEAR_AI_MODEL`. GLM 5.3 Flash and DeepSeek V4.1 Flash were tested first but kept "thinking" and returned no text within the short limit.
- **1Click token check**: BTC, ETH, SOL, BNB and USDC are supported (many chains). **HYPE is not**, so the trade page shows "Trade on Hyperliquid" for HYPE.
- **Signals** are pure maths (trend EMA 9/21 + 4h return, contrarian funding, OI change, order-book walls within 1%, estimated liquidation magnets). AI only writes the 2-line reason; a template sentence is used if AI fails.
- **Liquidation clusters are estimates**: OI split 50/50 long/short, spread over the last 24h of 15m closes by volume, leverage mix 10x 40%, 25x 30%, 50x 20%, 100x 10%, 0.5% maintenance margin.
- **Track record scoring**: if target and stop are touched in the same candle, it counts as a stop (the honest, worse case).
- **Design conflict**: DESIGN.md asks for a glow and pulsing liquidation dots in the intro; the global taste note says no glows or pulsing dots. DESIGN.md wins (as instructed), limited to the landing intro only.
- **Missing inputs**: `SECURITY.md`, `design-refs/` and `quants_bot_logo.png` were not in the folder at start. UI design waits for the reference images.
- **Next.js 15** (stable, App Router) + Tailwind 4 + Zod. Tools added: `tsx` (via npx) for running test scripts.

- **All coins, not just 5** (your request): every live Hyperliquid perp (179 today) gets live prices, signals and price alerts. BTC, ETH, SOL, BNB and HYPE stay "featured": defaults for new users, the intro orbit, and an AI reason every cycle.
- **AI cost stays flat**: AI reasons are written for the 5 featured coins plus the most-followed coins, capped per cycle (config, default 15 coins → max 1,440 small calls/day). Other coins get the template reason. Price alerts are maths only for every coin.
- **NEAR first for trading**: 46 of the 179 coins are spot-tradable through NEAR Intents (live check of the 1Click token list). Plan for the rest: open a leveraged trade on Hyperliquid, funded through NEAR Intents (1Click supports USDC into Hyperliquid), so money still moves through NEAR.
- **Watch-out**: Hyperliquid "k" coins (kPEPE, kSHIB) are priced per 1,000 tokens; the trade page must convert when quoting the real token.
- **Signals for many coins**: computed each cycle only for featured + followed coins, to stay inside Hyperliquid's rate limits.

## Decided on my own while you were away (please review)
- **Telegram bot**: your bot is **@QuantsSignal_Bot** (not @QuantsAlertBot from the brief). I set its 6 commands, description and About text through the Bot API. Telegram limits About to 120 characters, so it now reads: "AI market alerts for BTC, ETH, SOL and 170+ coins. Signals, price alerts and one-tap trades. Not financial advice." The profile picture is still pending (logo file missing).
- **Your personal price alerts are never dropped**: during quiet hours they wait until quiet hours end. The "max alerts per day" cap applies to signal and liquidation-magnet alerts only, not to alerts you set yourself.
- **Reminders with a condition** ("remind me at 9am if BTC is below 95k"): if the condition is false at 9am, the reminder is closed quietly instead of being sent.
- **Repeat until seen**: up to 3 sends in total (the first plus 2 repeats), every 15 minutes by default.
- **Abuse limit**: at most 500 open alerts per user (normal users never get near this).
- **1Click app fee**: supported (paid in basis points to a NEAR account inside Intents). Config `ONECLICK_APP_FEE_BPS`, default **0**, paid to `NEAR_PAYOUT_ACCOUNT` only if you set it above 0.
- **Dry quotes tested**: $20 USDC on Base → 0.000265 BTC (~$18.28, BTC network costs included, ~8 min) and → 0.248 SOL (~$19.93, ~30 s). No real transaction was made.
- **Database permissions**: browser users can only edit safe columns (not admin flags, Telegram chat id, or alert send counters).
- **NEAR payout account** saved as `sillymask4660.near` (from your NEAR Builders dashboard). Confirm before submission.

## 14 Nov 2026: decided while you were busy (please review)
- **Hosting**: deployed to Vercel production (https://quants-vert.vercel.app) under your "approve it yourself" instruction, because your internet can't reach Hyperliquid's API, so live data only works on Vercel. Nothing pushed to GitHub yet.
- **Scheduled agent**: Supabase pg_cron calls the app every minute (prices + alerts) and every 15 minutes (signals). The secret is in Supabase Vault.
- **Google sign-in**: Google Cloud project "My Project 58623" (yours), consent screen "Quants", published "In production" (no review needed for name/email only). The sign-in screen shows the Supabase address instead of "Quants" because a custom domain costs money.
- **NEAR wallet login** is optional, under Google and Try demo, as you asked.
- **Telegram**: webhook set to the live app, menu button "Open Quants".
- **Design**: followed your reference images: dark forest hero cards with lime highlights, soft grey canvas with white floating cards and corner arrow buttons, pill tabs, floating pill navigation on phones, Markets page with all 179 coins, big chart with 24H/7D/30D, dark login card. Subtle glass only on the landing and login.
- **Cut for time**: the long version of some polish (custom illustrations, candlestick chart). Signals page uses a line chart with stop/target lines.
- **PostCSS advisory**: tried to force the patched version, but it broke the build; reverted (build-time only, see SECURITY-REPORT.md).
- **Mistake and fix**: a test command set the live public Supabase key to "x", which broke all logins for about an hour; fixed and re-verified.

## After the hackathon (not built now)
- Hyperliquid builder codes would let Quants place leveraged orders inside the app (user signs with their own wallet) and earn a small fee per trade without referral volume.
