// Small server guards: cron secret check and a per-key rate limiter that only stops abusers.
import "server-only";
import { safeEqual } from "../telegram/security";

export function isCron(req: Request): boolean {
  const s = process.env.CRON_SECRET;
  const h = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return !!s && s.length >= 16 && safeEqual(h, s);
}

// In-memory sliding window per server instance. Generous limits: normal use never hits them.
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { buckets.set(key, arr); return false; }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 20_000) buckets.clear();
  return true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
