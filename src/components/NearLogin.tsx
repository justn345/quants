"use client";
import { useState } from "react";

export function NearLogin() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div>
      <button className="btn btn-ghost w-full text-cream" disabled={busy} onClick={async () => {
        setBusy(true); setErr("");
        try {
          const { NearConnector } = await import("@hot-labs/near-connect");
          const n = await fetch("/api/auth/near", { cache: "no-store" }).then((r) => r.json());
          const nonce = Uint8Array.from(atob(n.nonce), (c) => c.charCodeAt(0));
          const connector = new NearConnector({ footerBranding: null });
          const done = new Promise<{ accountId: string; publicKey: string; signature: string }>((resolve, reject) => {
            connector.on("wallet:signInAndSignMessage", (t: { accounts: { accountId: string; signedMessage?: { publicKey: string; signature: string; accountId?: string } }[] }) => {
              const a = t.accounts[0];
              if (!a?.signedMessage) return reject(new Error("Your wallet did not sign the message."));
              resolve({ accountId: a.signedMessage.accountId ?? a.accountId, publicKey: a.signedMessage.publicKey, signature: a.signedMessage.signature });
            });
          });
          await connector.connect({ signMessageParams: { message: n.message, recipient: n.recipient, nonce } } as never);
          const signed = await done;
          const r = await fetch("/api/auth/near", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...signed, nonce: n.nonce }) }).then((x) => x.json());
          if (r.redirect) location.href = r.redirect; else throw new Error(r.error ?? "Sign-in failed");
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Sign-in failed");
          setBusy(false);
        }
      }}>{busy ? "Waiting for your wallet…" : "Sign in with a NEAR wallet"}</button>
      <p className="mt-1 text-xs font-medium text-mist">Signs a message only. No transaction, no fees.</p>
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-coral">{err}</p>}
    </div>
  );
}
