// Debug helper: show the raw NEAR AI reply (or error) for one reason request. Never prints the key.
import { nearChat } from "../src/lib/ai/nearai";

async function main() {
  try {
    const out = await nearChat(
      [
        { role: "system", content: "Write two short plain-English lines explaining a crypto signal. Max 220 characters." },
        { role: "user", content: JSON.stringify({ coin: "BTC", signal: "No clear edge", price: 69000 }) },
      ],
      { maxTokens: 120 },
    );
    console.log("OK:", JSON.stringify(out));
  } catch (e) {
    console.log("ERR:", e instanceof Error ? e.message : e);
  }
}
main();
