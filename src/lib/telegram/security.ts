// Telegram safety: webhook secret check and one-time, expiring link codes.
// Uses Web Crypto only, so it runs in Node, Vercel and Supabase Edge (Deno).

/** Constant-time string compare (avoids leaking the secret through timing). */
export function safeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a), eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

/** Telegram sends our secret in this header on every webhook call. Reject anything else. */
export function verifyWebhook(headerValue: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !headerValue) return false;
  return safeEqual(headerValue, secret);
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const LINK_CODE_TTL_MIN = 10;

/** New link code: the plain code goes in the deep link once; only its hash is stored. */
export async function newLinkCode(now = new Date()) {
  const code = b64url(crypto.getRandomValues(new Uint8Array(18))); // 24 chars, fits Telegram's /start limit
  return { code, hash: await sha256(code), expiresAt: new Date(now.getTime() + LINK_CODE_TTL_MIN * 60_000) };
}

export function deepLink(botUsername: string, code: string): string {
  return `https://t.me/${encodeURIComponent(botUsername)}?start=${code}`;
}

/** /start payloads must look like our codes before we even hash them. */
export function isLinkCodeShape(s: string): boolean {
  return /^[A-Za-z0-9_-]{24}$/.test(s);
}
