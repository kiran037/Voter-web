// src/hooks/useMe.ts
"use client";

import { useEffect, useState } from "react";

export type Me = {
  id: string;
  phone: string;
  name: string | null;
  role: "ADMIN" | "STAFF";
  phoneVerifiedAt: string | null;
  createdAt: string;
} | null;

let lastCache: { me: Me; at: number } | null = null;

export function useMe() {
  const [me, setMe] = useState<Me>(lastCache?.me ?? null);
  const [loading, setLoading] = useState(!lastCache);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // soft cache for a few seconds
        if (lastCache && Date.now() - lastCache.at < 5000) {
          if (!cancelled) { setMe(lastCache.me); setLoading(false); }
          return;
        }
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!cancelled) {
          if (r.ok) {
            const j = await r.json();
            lastCache = { me: j.user ?? null, at: Date.now() };
            setMe(j.user ?? null);
          } else {
            lastCache = { me: null, at: Date.now() };
            setMe(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { me, loading, isAdmin: (me?.role ?? "STAFF") === "ADMIN" };
}
