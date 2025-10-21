// // src/hooks/useMe.ts
"use client";

import { useEffect, useRef, useState } from "react";

export type Me = {
  id: string;
  phone: string;
  name: string | null;
  role: "ADMIN" | "STAFF";
  phoneVerifiedAt: string | null;
  createdAt: string;
} | null;

const CACHE_TTL_MS = 5000;

let lastCache: { me: Me; at: number } | null = null;

export function useMe() {
  const [me, setMe] = useState<Me>(lastCache?.me ?? null);
  const [loading, setLoading] = useState(!lastCache);
  const abortRef = useRef<AbortController | null>(null);

  async function fetchMe(bypassCache = false) {
    // soft cache
    if (!bypassCache && lastCache && Date.now() - lastCache.at < CACHE_TTL_MS) {
      setMe(lastCache.me);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const r = await fetch("/api/auth/me", { cache: "no-store", signal: ac.signal });
      if (!r.ok) {
        lastCache = { me: null, at: Date.now() };
        setMe(null);
      } else {
        const j = await r.json();
        lastCache = { me: j.user ?? null, at: Date.now() };
        setMe(j.user ?? null);
      }
    } catch {
      // ignore abort/network errors, keep current state
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(!lastCache);
    fetchMe(false);

    const onFocus = () => fetchMe(true);
    const onAuthChanged = () => fetchMe(true); // you can dispatch this after login/logout

    window.addEventListener("focus", onFocus);
    window.addEventListener("auth:changed", onAuthChanged as EventListener);

    return () => {
      abortRef.current?.abort();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("auth:changed", onAuthChanged as EventListener);
    };
  }, []);

  return {
    me,
    loading,
    isAdmin: (me?.role ?? "STAFF") === "ADMIN",
    refresh: () => fetchMe(true),
  };
}
