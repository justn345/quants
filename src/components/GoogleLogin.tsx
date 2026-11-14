"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

export function GoogleLogin() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <div>
      <button className="btn w-full bg-cream text-ink hover:bg-white" disabled={busy} onClick={async () => {
        setBusy(true); setErr("");
        const { error } = await browserClient().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
        });
        if (error) { setErr("Google sign-in is not available right now. Try the demo."); setBusy(false); }
      }}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" /></svg>
        {busy ? "Opening Google…" : "Continue with Google"}
      </button>
      {err && <p role="alert" className="mt-2 text-sm font-semibold text-coral">{err}</p>}
    </div>
  );
}
