# Decisions log

Short notes on choices made while building, so you can review them later.

## 13 Nov 2026
- **Pasted key was not a NEAR AI key.** It is a NEAR Builders directory (MCP) key; NEAR AI Cloud returned 401. Stored in `.env.local` as `NEAR_BUILDERS_MCP_KEY`. `NEAR_AI_API_KEY` is still needed. The guide's request to create a builder profile was not acted on (not part of the build).
- **NEAR AI**: base URL `https://cloud-api.near.ai/v1` (from docs.near.ai, checked against `/v1/models`). Model `z-ai/glm-5.3-flash`: small, cheap, open-weights; changeable via `NEAR_AI_MODEL`.
- **1Click token check**: BTC, ETH, SOL, BNB and USDC are supported (many chains). **HYPE is not**, so the trade page shows "Trade on Hyperliquid" for HYPE.
- **Signals** are pure maths (trend EMA 9/21 + 4h return, contrarian funding, OI change, order-book walls within 1%, estimated liquidation magnets). AI only writes the 2-line reason; a template sentence is used if AI fails.
- **Liquidation clusters are estimates**: OI split 50/50 long/short, spread over the last 24h of 15m closes by volume, leverage mix 10x 40%, 25x 30%, 50x 20%, 100x 10%, 0.5% maintenance margin.
- **Track record scoring**: if target and stop are touched in the same candle, it counts as a stop (the honest, worse case).
- **Design conflict**: DESIGN.md asks for a glow and pulsing liquidation dots in the intro; the global taste note says no glows or pulsing dots. DESIGN.md wins (as instructed), limited to the landing intro only.
- **Missing inputs**: `SECURITY.md`, `design-refs/` and `quants_bot_logo.png` were not in the folder at start. UI design waits for the reference images.
- **Next.js 15** (stable, App Router) + Tailwind 4 + Zod. Tools added: `tsx` (via npx) for running test scripts.

## After the hackathon (not built now)
- Hyperliquid builder codes would let Quants place leveraged orders inside the app (user signs with their own wallet) and earn a small fee per trade without referral volume.
