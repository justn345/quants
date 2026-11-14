"use client";
// Profile: photo (Supabase Storage, own folder only), display name, bio, check-in preference.
/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";

export function ProfileCard({ uid, name, bio, avatar, checkins, demo }: { uid: string; name: string; bio: string; avatar: string | null; checkins: boolean; demo: boolean }) {
  const sb = browserClient();
  const router = useRouter();
  const [n, setN] = useState(name);
  const [b, setB] = useState(bio);
  const [ci, setCi] = useState(checkins);
  const [img, setImg] = useState(avatar);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setMsg("Use a PNG, JPG or WebP image.");
    if (file.size > 2 * 1024 * 1024) return setMsg("Image must be under 2 MB.");
    setBusy(true); setMsg("");
    const ext = file.type.split("/")[1];
    const path = `${uid}/avatar-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
    if (error) { setBusy(false); return setMsg("Upload failed. Try another image."); }
    const url = sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    await sb.from("profiles").update({ avatar_url: url }).eq("id", uid);
    setImg(url); setBusy(false); setMsg("Photo updated."); router.refresh();
  };

  return (
    <section className="card p-6">
      <h2 className="text-lg font-extrabold">Profile</h2>
      <div className="mt-4 flex flex-wrap items-start gap-6">
        <div className="flex flex-col items-center gap-2">
          {img ? <img src={img} alt="Your profile photo" className="h-24 w-24 rounded-full object-cover ring-4 ring-paper" />
            : <span className="flex h-24 w-24 items-center justify-center rounded-full bg-night text-3xl font-black text-signal">{(n || "Q").slice(0, 1).toUpperCase()}</span>}
          <label className={`btn btn-ghost h-9 cursor-pointer px-4 text-sm ${demo ? "pointer-events-none opacity-50" : ""}`}>
            {busy ? "Uploading…" : "Change photo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={demo || busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {demo && <span className="text-xs font-semibold text-ink-2">Sign in to add a photo</span>}
        </div>
        <div className="min-w-[240px] flex-1 space-y-3">
          <label className="block space-y-1"><span className="label">Display name</span><input className="input" maxLength={60} value={n} onChange={(e) => setN(e.target.value)} /></label>
          <label className="block space-y-1"><span className="label">Bio</span><textarea className="input h-24 py-2" maxLength={280} value={b} onChange={(e) => setB(e.target.value)} placeholder="e.g. Swing trader, mostly BTC and SOL." /><span className="text-xs font-semibold text-ink-2">{b.length}/280</span></label>
          <label className="flex items-center gap-3 rounded-2xl bg-paper p-3">
            <input type="checkbox" className="h-5 w-5 accent-[#007D10]" checked={ci} onChange={(e) => setCi(e.target.checked)} />
            <span><span className="block font-bold">Market check-ins every 4 hours</span><span className="text-xs font-semibold text-ink-2">The agent tells you on Telegram whether to wait or act on your coins.</span></span>
          </label>
          <button className="btn btn-dark" onClick={async () => {
            const { error } = await sb.from("profiles").update({ display_name: n.trim().slice(0, 60) || null, bio: b.trim().slice(0, 280) || null, notify_checkins: ci }).eq("id", uid);
            setMsg(error ? "Could not save." : "Profile saved."); router.refresh();
          }}>Save profile</button>
          {msg && <p role="status" className="text-sm font-semibold">{msg}</p>}
        </div>
      </div>
    </section>
  );
}
