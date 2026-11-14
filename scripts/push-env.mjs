// Copies selected values from .env.local into Vercel production env vars (values are never printed).
// Usage: node scripts/push-env.mjs NAME1 NAME2 ...   (or with NAME=value overrides)
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
for (const arg of process.argv.slice(2)) {
  const [name, override] = arg.includes("=") ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)] : [arg, undefined];
  const value = override ?? env[name];
  if (!value) { console.log(`skip ${name} (empty)`); continue; }
  spawnSync("npx.cmd", ["vercel", "env", "rm", name, "production", "--yes"], { stdio: "ignore", shell: true });
  const r = spawnSync("npx.cmd", ["vercel", "env", "add", name, "production"], { input: value, stdio: ["pipe", "ignore", "pipe"], shell: true });
  console.log(`${name}: ${r.status === 0 ? "set" : "FAILED " + String(r.stderr).replace(value, "[hidden]").slice(0, 200)}`);
}
