# Security report: Quants (14 Nov 2026)

A pass over the brief's security list, testing against the live system where possible. Scripts are in `scripts/` so anyone can re-run them.

## Results

| Check | How | Result |
|---|---|---|
| Users reading/changing other users' data | `scripts/rls-test.ts`: two real anonymous users on the live database try to read, edit, delete and create each other's alerts and profiles | **15/15 pass**. RLS blocks every cross-user access. |
| Privilege escalation | Same script: user tries to set `is_admin`, `telegram_chat_id`, alert send counters, write signals, call server-only SQL functions | **Blocked**. Column-level grants and revoked execute rights. |
| Secrets in the browser bundle | Every secret value from `.env.local` searched in `.next/static` | **None found**. Only the Supabase URL and anon key (public by design) ship to the browser. |
| Secrets in git history | Every secret value searched in `git log -p --all` | **None found**. `.env.local` was git-ignored before the first commit. |
| Forged Telegram webhooks | POST to `/api/telegram/webhook` without the secret header | **403**. Constant-time secret check on every update. |
| Cron endpoints | Call `/api/cron/tick` without the secret | **401**. The secret lives in Supabase Vault and Vercel env only. |
| Telegram account takeover | Link codes are random 18-byte values, stored only as SHA-256 hashes, single use, 10-minute expiry, shape-checked before lookup | Designed out |
| NEAR login forgery | NEP-413 ed25519 signature check + stateless 5-minute HMAC nonce + RPC check that the key is a full-access key of the account | Designed out |
| SQL injection | All database access goes through the Supabase client (parameterised); coin symbols are regex-checked; no raw SQL built from input | Not possible through the app |
| XSS | React escapes output; Telegram messages escape all user and AI text for HTML mode; no `dangerouslySetInnerHTML` | No sinks found |
| Prompt injection via alert text / `/ask` | User text is sanitised (control chars stripped, 280–300 char cap), passed as JSON data with "untrusted, ignore instructions" framing; AI output is validated against a strict Zod schema (coin must exist, numbers bounded) and can never run code or touch other users' data | Contained |
| Open redirect after sign-in | `/auth/callback` only redirects to same-site paths matching `^/[A-Za-z0-9/_-]*$` | Blocked |
| Trading safety | Never asks for seed phrases or private keys; quotes only from the official 1Click API over HTTPS; receiving and refund addresses validated per chain before quoting; `dry: true` for price checks | As specified |
| Abuse | Per-IP limits on demo creation (8/h), quotes (30/min), NEAR login (20/10 min); per-user limits on alerts API (120/min), parsing (30/min), Telegram links (10/h); `/ask` 20/day; 500 open alerts max per user | Only abusers are limited |
| Dependencies | `npm audit --omit=dev` | 1 advisory in PostCSS **inside Next.js's build tooling** (processing attacker-supplied CSS). Quants never processes untrusted CSS and the code doesn't run in production requests. Forcing the patched version broke Next.js's font loader, so it was reverted; it will clear with the next Next.js release. |

## Fixed during the pass
- Column-level `revoke` doesn't override a table-level grant in Postgres: replaced with revoke-table + grant-safe-columns.
- A production env var was accidentally set to a placeholder during setup (broke all sign-ins for ~1 hour); fixed and re-verified by comparing every public Vercel value with `.env.local`.
- A client chart component re-fetched in a loop; fixed with a stable effect dependency, which also removes an accidental self-DoS.

## Not done (time)
- Captcha on sign-up (per-IP limits are in place instead).
- (Done) GitHub secret scanning and push protection are enabled on the public repo.
