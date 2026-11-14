"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches server data every N seconds (prices come from the shared cache, not per-visitor API calls). */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
