// NEAR wallet login (NEP-413 signed message). No transaction, no gas.
// 1) server issues a short-lived HMAC nonce, 2) wallet signs {message, nonce, recipient},
// 3) server checks the ed25519 signature AND that the key is a full-access key of the account (RPC).
import "server-only";
import { ed25519 } from "@noble/curves/ed25519.js";
import { createHmac, timingSafeEqual } from "node:crypto";

export const LOGIN_MESSAGE = "Sign in to Quants";
export const LOGIN_RECIPIENT = "quants.app";
const NEP413_TAG = 2147484061; // 2^31 + 413
const MAX_AGE_MS = 5 * 60_000;

function secret() {
  const s = process.env.CRON_SECRET;
  if (!s) throw new Error("server secret missing");
  return s;
}

/** 32-byte nonce: 8 bytes timestamp + 24 bytes HMAC. Stateless and expires after 5 minutes. */
export function issueNonce(now = Date.now()): string {
  const ts = Buffer.alloc(8);
  ts.writeBigUInt64BE(BigInt(now));
  const mac = createHmac("sha256", secret()).update(ts).digest().subarray(0, 24);
  return Buffer.concat([ts, mac]).toString("base64");
}

export function checkNonce(b64: string, now = Date.now()): Buffer | null {
  const buf = Buffer.from(b64, "base64");
  if (buf.length !== 32) return null;
  const ts = buf.subarray(0, 8);
  const mac = createHmac("sha256", secret()).update(ts).digest().subarray(0, 24);
  if (!timingSafeEqual(mac, buf.subarray(8))) return null;
  const age = now - Number(ts.readBigUInt64BE());
  return age >= 0 && age <= MAX_AGE_MS ? buf : null;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58decode(s: string): Uint8Array {
  let n = 0n;
  for (const ch of s) { const i = B58.indexOf(ch); if (i < 0) throw new Error("bad base58"); n = n * 58n + BigInt(i); }
  const bytes: number[] = [];
  while (n > 0n) { bytes.unshift(Number(n % 256n)); n /= 256n; }
  for (const ch of s) { if (ch === "1") bytes.unshift(0); else break; }
  return Uint8Array.from(bytes);
}

function borshString(s: string): Buffer {
  const b = Buffer.from(s, "utf8");
  const len = Buffer.alloc(4); len.writeUInt32LE(b.length);
  return Buffer.concat([len, b]);
}

async function nep413Hash(message: string, nonce: Buffer, recipient: string): Promise<Uint8Array> {
  const tag = Buffer.alloc(4); tag.writeUInt32LE(NEP413_TAG);
  const payload = Buffer.concat([tag, borshString(message), nonce, borshString(recipient), Buffer.from([0])]); // callbackUrl: None
  return new Uint8Array(await crypto.subtle.digest("SHA-256", payload));
}

export const ACCOUNT_RE = /^(?=.{2,64}$)(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

async function isFullAccessKey(accountId: string, publicKey: string): Promise<boolean> {
  const res = await fetch("https://rpc.mainnet.near.org", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "q", method: "query", params: { request_type: "view_access_key", finality: "final", account_id: accountId, public_key: publicKey } }),
  });
  const j = (await res.json().catch(() => ({}))) as { result?: { permission?: unknown } };
  return j.result?.permission === "FullAccess";
}

export async function verifyNearLogin(o: { accountId: string; publicKey: string; signature: string; nonce: string }): Promise<string | null> {
  if (!ACCOUNT_RE.test(o.accountId)) return null;
  const nonce = checkNonce(o.nonce);
  if (!nonce) return null;
  if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,50}$/.test(o.publicKey)) return null;
  const pk = b58decode(o.publicKey.slice(8));
  const sig = Buffer.from(o.signature, "base64");
  if (pk.length !== 32 || sig.length !== 64) return null;
  const hash = await nep413Hash(LOGIN_MESSAGE, nonce, LOGIN_RECIPIENT);
  if (!ed25519.verify(sig, hash, pk)) return null;
  if (!(await isFullAccessKey(o.accountId, o.publicKey))) return null;
  return o.accountId;
}
