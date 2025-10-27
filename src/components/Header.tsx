// src/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { User as UserIcon, ChevronDown, LogOut } from "lucide-react";

type Me = { id: string; phone: string; name: string | null; role: "ADMIN" | "STAFF" };

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const hide = pathname?.startsWith("/signin") ?? false;

  // Load current user (now includes role)
  useEffect(() => {
    if (hide) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!cancelled && r.ok) {
          const j = await r.json();
          setMe(j.user as Me);
        } else if (!cancelled) {
          setMe(null);
        }
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hide]);

  // Scroll effect
  useEffect(() => {
    if (hide) return;
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [hide]);

  // Close menus on route change
  useEffect(() => {
    setOpen(false);
    setConfirmOpen(false);
  }, [pathname]);

  // Close on outside click / Esc
  useEffect(() => {
    if (hide) return;
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirmOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, hide]);

  async function doLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setOpen(false);
    setConfirmOpen(false);
    setMe(null);
    router.replace("/signin");
    router.refresh();
    setTimeout(() => {
      if (location.pathname !== "/signin") location.href = "/signin";
    }, 50);
  }

  const displayName =
    me?.name?.trim() ||
    (me?.phone ? me.phone.replace(/^\+?(\d{2})(\d{4})(\d{3})(\d{3})$/, "+$1 $2-$3-$4") : "User");

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isAdmin = (me?.role ?? "STAFF") === "ADMIN";

  // Active pill styling for nav links
  const navCls = (active: boolean) =>
    `px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
      active
        ? "bg-white/90 backdrop-blur-xl text-[#EF3340] shadow border border-slate-200/60"
        : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
    }`;

  if (hide) return null;

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>

      <header
        className={`w-full sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm"
            : "bg-gradient-to-b from-white to-slate-50/40"
        }`}
      >
        <div className="mx-auto w-full px-4 h-16 flex items-center justify-between">
          {/* Left: Logo + Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 min-w-0 group relative overflow-hidden rounded-xl px-3 py-2 -ml-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-rose-50 hover:to-orange-50"
          >
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-8 h-8">
              <Image
                src="/logo.png"
                alt="Apna Ward Logo"
                fill
                className="object-contain"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                priority
              />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-gray-900 via-[#3D3D3D] to-gray-900 bg-clip-text text-transparent truncate">
              Apna Ward
            </span>
          </Link>

          {/* Middle: Nav links (Users visible only to ADMIN) */}
          <nav className="hidden md:flex items-center gap-2">
            <Link href="/" className={navCls(pathname === "/" || pathname?.startsWith("/?"))}>
              Home
            </Link>
            {isAdmin && (
              <Link href="/users" className={navCls(pathname?.startsWith("/users") ?? false)}>
                Users
              </Link>
            )}
          </nav>

          {/* Right: Profile menu */}
          <div className="relative">
            <button
              ref={btnRef}
              onClick={() => setOpen((v) => !v)}
              className={`flex items-center gap-3 rounded-full pl-1 pr-4 py-1 transition-all duration-300 ${
                open
                  ? "bg-gradient-to-r from-[#EF3340] to-[#FF5560] shadow-lg shadow-red-500/30 scale-105"
                  : "bg-white/90 backdrop-blur-xl border border-slate-200/60 hover:border-[#EF3340]/50 hover:shadow-md hover:scale-105"
              }`}
              aria-haspopup="menu"
              aria-expanded={open}
              type="button"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                  open
                    ? "bg-white text-[#EF3340] shadow-inner"
                    : "bg-gradient-to-br from-[#EF3340] to-[#C82333] text-white shadow-md"
                }`}
              >
                {initials || <UserIcon size={18} />}
              </div>
              <span
                className={`text-sm font-medium max-w-[140px] truncate transition-colors ${
                  open ? "text-white" : "text-slate-700"
                }`}
              >
                {displayName}
              </span>
              <ChevronDown
                size={16}
                className={`transition-all duration-300 ${open ? "rotate-180 text-white" : "text-slate-500"}`}
              />
            </button>

            {open && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2"
              >
                <div className="p-4 bg-gradient-to-br from-rose-50 to-orange-50 border-b border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EF3340] to-[#C82333] flex items-center justify-center text-white font-bold shadow-lg">
                      {initials || <UserIcon size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{displayName}</div>
                      <div className="text-xs text-slate-600 truncate">{me?.phone ?? ""}</div>
                    </div>
                  </div>
                </div>

                {/* Small-screen nav (duplicate for accessibility); Users visible only to ADMIN */}
                <div className="md:hidden">
                  <Link
                    href="/"
                    onClick={() => setOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-gradient-to-r hover:from-rose-50 hover:to-orange-50 transition-all duration-200"
                    role="menuitem"
                  >
                    Home
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/users"
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-gradient-to-r hover:from-rose-50 hover:to-orange-50 transition-all duration-200"
                      role="menuitem"
                    >
                      Users
                    </Link>
                  )}
                  <div className="h-px bg-slate-200/60 mx-4" />
                </div>

                <button
                  onClick={() => {
                    setOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-gradient-to-r hover:from-rose-50 hover:to-orange-50 transition-all duration-200 group"
                  role="menuitem"
                  type="button"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                    <LogOut size={16} className="text-slate-600 group-hover:text-[#EF3340] transition-colors" />
                  </div>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-br from-rose-50 to-orange-50 border-b border-slate-200/60">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#EF3340] to-[#C82333] flex items-center justify-center shadow-lg">
                <LogOut size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-center text-slate-900">Confirm Logout</h2>
            </div>
            <div className="p-6 text-center text-slate-600">
              Are you sure you want to logout from your account?
            </div>
            <div className="p-6 bg-slate-50/60 flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-6 py-2.5 rounded-xl font-semibold border border-slate-300 hover:border-slate-400 bg-white hover:shadow-sm transition-all duration-200 active:scale-[0.98]"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={doLogout}
                className="px-6 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white hover:from-[#D82D39] hover:to-[#B01F2C] shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
                type="button"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
