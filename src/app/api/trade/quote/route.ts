// Quote a non-custodial swap through NEAR Intents (1Click). Quants never holds funds:
// the user sends to the quote's deposit address and receives on their own address.
import { z } from "zod";
import { clientIp, json, rateLimit } from "@/lib/server/guard";
import { fetchOneClickTokens, getQuote, isValidAddress, toSpotSymbol, type OneClickToken } from "@/lib/trade/oneclick";
import { currentUser, adminClient } from "@/lib/supabase/server";

let cache: { at: number; tokens: OneClickToken[] } | null = null;
async function tokens() {
  if (!cache || Date.now() - cache.at > 5 * 60_000) cache = { at: Date.now(), tokens: await fetchOneClickTokens() };
  return cache.tokens;
}

const Body = z.object({
  coin: z.string().regex(/^[A-Za-z0-9]{1,15}$/),
  side: z.enum(["buy", "sell"]),
  coinAssetId: z.string().max(200),   // which chain version of the coin
  payAssetId: z.string().max(200),    // the other side (e.g. USDC on Base)
  amount: z.string().regex(/^\d+(\.\d+)?$/).max(30), // human units of what the user sends
  recipient: z.string().min(2).max(128),
  refundTo: z.string().min(2).max(128),
  dry: z.boolean().default(true),
});

export async function GET() {
  const list = await tokens();
  return json({ tokens: list.map((t) => ({ assetId: t.assetId, symbol: t.symbol, blockchain: t.blockchain, decimals: t.decimals, price: t.price })) },
    200, { "Cache-Control": "public, s-maxage=300" });
}

export async function POST(req: Request) {
  if (!rateLimit(`quote:${clientIp(req)}`, 30, 60_000)) return json({ error: "Too many quotes. Wait a minute." }, 429);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Check the amount and addresses." }, 400);
  const b = p.data;
  const list = await tokens();
  const coinTok = list.find((t) => t.assetId === b.coinAssetId);
  const payTok = list.find((t) => t.assetId === b.payAssetId);
  if (!coinTok || !payTok || coinTok.symbol.toUpperCase() !== toSpotSymbol(b.coin).toUpperCase()) return json({ error: "That token isn't available through NEAR Intents." }, 400);
  const from = b.side === "buy" ? payTok : coinTok;
  const to = b.side === "buy" ? coinTok : payTok;
  if (!isValidAddress(to.blockchain, b.recipient)) return json({ error: `Receiving address doesn't look like a valid ${to.blockchain.toUpperCase()} address.` }, 400);
  if (!isValidAddress(from.blockchain, b.refundTo)) return json({ error: `Refund address doesn't look like a valid ${from.blockchain.toUpperCase()} address.` }, 400);
  const [i, f = ""] = b.amount.split(".");
  if (f.length > from.decimals) return json({ error: "Too many decimals." }, 400);
  const units = (BigInt(i) * 10n ** BigInt(from.decimals) + BigInt((f + "0".repeat(from.decimals)).slice(0, from.decimals) || "0")).toString();
  if (units === "0") return json({ error: "Amount must be above zero." }, 400);
  try {
    const { quote, correlationId } = await getQuote({ originAsset: from.assetId, destinationAsset: to.assetId, amount: units, recipient: b.recipient.trim(), refundTo: b.refundTo.trim(), dry: b.dry });
    if (!b.dry && quote.depositAddress) {
      const { user } = await currentUser();
      if (user) await adminClient().from("trades").insert({
        user_id: user.id, coin: b.coin, side: b.side, origin_asset: from.assetId, destination_asset: to.assetId, amount_in: units,
        amount_out_expected: quote.amountOut, deposit_address: quote.depositAddress, recipient: b.recipient.trim(), status: "PENDING_DEPOSIT", quote: { ...quote, correlationId },
      });
    }
    return json({ quote, from: { symbol: from.symbol, chain: from.blockchain }, to: { symbol: to.symbol, chain: to.blockchain } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message.slice(0, 200) : "Quote failed" }, 502);
  }
}
