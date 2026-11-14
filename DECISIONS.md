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

## After the hackathon (not built now)
- Hyperliquid builder codes would let Quants place leveraged orders inside the app (user signs with their own wallet) and earn a small fee per trade without referral volume.
