// Signed user reference for links sent in Telegram/push, so the trade page can record a user's
// own "Trade" click without a login cookie (Telegram's in-app browser has none).
// Format: <user uuid>.<16 hex HMAC>. Cannot be forged without the server secret.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const mac = (uid: string) => createHmac("sha256", process.env.CRON_SECRET ?? "").update(`ref:${uid}`).digest("hex").slice(0, 16);

export function signRef(uid: string): string {
  return `${uid}.${mac(uid)}`;
}

export function readRef(ref: string | null | undefined): string | null {
  if (!ref) return null;
  const m = ref.match(/^([0-9a-f-]{36})\.([0-9a-f]{16})$/);
  if (!m) return null;
  const a = Buffer.from(m[2]), b = Buffer.from(mac(m[1]));
  return a.length === b.length && timingSafeEqual(a, b) ? m[1] : null;
}

export function tradeLink(base: string, coin: string, uid: string, extra = ""): string {
  return `${base}/trade/${encodeURIComponent(coin)}?r=${signRef(uid)}${extra}`;
}
