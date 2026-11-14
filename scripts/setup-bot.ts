// One-time bot profile setup (commands, about, description). Run: npx tsx scripts/setup-bot.ts
import { tg } from "../src/lib/telegram/api";

async function main() {
  await tg("setMyCommands", {
    commands: [
      { command: "start", description: "Connect your Quants account" },
      { command: "menu", description: "Main menu" },
      { command: "signals", description: "Signals for your coins" },
      { command: "check", description: "Market check: wait or act?" },
      { command: "alerts", description: "Your active alerts" },
      { command: "watchlist", description: "Coins you follow" },
      { command: "ask", description: "Ask Quants about a coin" },
      { command: "settings", description: "Notification settings" },
      { command: "help", description: "How Quants works" },
    ],
  });
  await tg("setMyShortDescription", {
    short_description: "AI market alerts for 170+ coins. Liquidity map, signals, price alerts, one-tap trades. Not financial advice.",
  });
  await tg("setMyDescription", {
    description:
      "Quants AI watches the market for you. Pick your coins, set your own price levels, and get a clear alert the moment something happens, with a one-tap Trade button. Built on NEAR. Not financial advice; always do your own research.",
  });
  const me = await tg<{ username: string }>("getMe", {});
  const cmds = await tg<{ command: string }[]>("getMyCommands", {});
  console.log(`Bot @${me.username} set up with commands: ${cmds.map((c) => "/" + c.command).join(" ")}`);
}
main().catch((e) => { console.error("Setup failed:", e.message); process.exit(1); });
