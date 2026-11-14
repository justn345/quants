// Fund a Hyperliquid perps account through NEAR Intents: pay USDC/USDT on any supported chain,
// receive USDC in the user's own Hyperliquid account. Quants never holds funds.
import { z } from "zod";
import { clientIp, json, rateLimit } from "@/lib/server/guard";
import { fetchOneClickTokens, getQuote, isValidAddress, HL_USDC, type OneClickToken } from "@/lib/trade/oneclick";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { readRef } from "@/lib/server/ref";

let cache: { at: number; tokens: OneClickToken[] } | null = null;
async function tokens() {
  if (!cache || Date.now() - cache.at > 5 * 60_000) cache = { at: Date.now(), tokens: await fetchOneClickTokens() };
  return cache.tokens;
}

const Body = z.object({
  coin: z.string().regex(/^[A-Za-z0-9]{1,15}$/),
  payAssetId: z.string().max(200),
  amount: z.string().regex(/^\d+(\.\d+)?$/).max(30),
  hlAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  refundTo: z.string().min(2).max(128),
  dry: z.boolean().default(true),
  ref: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  if (!rateLimit(`fund:${clientIp(req)}`, 30, 60_000)) return json({ error: "Too many quotes. Wait a minute." }, 429);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Check the amount and that your Hyperliquid address is a 0x address." }, 400);
  const b = p.data;
  const db = adminClient();
  const uid = readRef(b.ref) ?? (await currentUser().catch(() => ({ user: null }))).user?.id ?? null;
  if (!b.dry && uid) {
    const { data: prof } = await db.from("profiles").select("is_demo").eq("id", uid).maybeSingle();
    if (prof?.is_demo) return json({ error: "Demo accounts can check prices but not trade. Sign in to get a real deposit address." }, 403);
  }
  const pay = (await tokens()).find((t) => t.assetId === b.payAssetId && ["USDC", "USDT"].includes(t.symbol));
  if (!pay) return json({ error: "Pick USDC or USDT to pay with." }, 400);
  if (!isValidAddress(pay.blockchain, b.refundTo)) return json({ error: `Refund address doesn't look like a valid ${pay.blockchain.toUpperCase()} address.` }, 400);
  const [i, f = ""] = b.amount.split(".");
  if (f.length > pay.decimals) return json({ error: "Too many decimals." }, 400);
  const units = BigInt(i) * 10n ** BigInt(pay.decimals) + BigInt((f + "0".repeat(pay.decimals)).slice(0, pay.decimals) || "0");
  if (units < 1n * 10n ** BigInt(pay.decimals)) return json({ error: "Minimum is 1 USDC." }, 400);
  try {
    const { quote } = await getQuote({ originAsset: pay.assetId, destinationAsset: HL_USDC, amount: units.toString(), recipient: b.hlAddress, refundTo: b.refundTo.trim(), dry: b.dry });
    if (uid) await db.from("activity").insert({ user_id: uid, kind: b.dry ? "quote" : "deposit_address", coin: b.coin,
      meta: { side: "fund leverage", from: `${pay.symbol}/${pay.blockchain}`, to: "USDC/Hyperliquid", amountIn: quote.amountInFormatted, amountOut: quote.amountOutFormatted } }).then(() => undefined, () => undefined);
    return json({ quote, from: { symbol: pay.symbol, chain: pay.blockchain } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message.slice(0, 200) : "Quote failed" }, 502);
  }
}
