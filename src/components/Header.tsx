// src/components/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { User as UserIcon, ChevronDown, LogOut } from "lucide-react";

type Me = { id: string; phone: string; name: string | null };

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

  // Load current user
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

  if (hide) return null;

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 51, 64, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(239, 51, 64, 0);
          }
        }
        .shimmer {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.6),
            transparent
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .float {
          animation: float 3s ease-in-out infinite;
        }
        .slide-down {
          animation: slideDown 0.2s ease-out;
        }
        .scale-in {
          animation: scaleIn 0.2s ease-out;
        }
        .pulse-ring {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>

      <header
        className={`w-full sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm"
            : "bg-gradient-to-b from-white to-gray-50/30"
        }`}
      >
        <div className="mx-auto w-full px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 min-w-0 group relative overflow-hidden rounded-xl px-3 py-2 -ml-3 transition-all duration-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50"
          >
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-8 h-8 float">
              <Image
                src="/logo.png"
                alt="Udaipur Voters"
                fill
                className="object-contain"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                priority
              />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-gray-900 via-[#3D3D3D] to-gray-900 bg-clip-text text-transparent truncate">
              Udaipur Voters
            </span>
          </Link>

          <div className="relative">
            <button
              ref={btnRef}
              onClick={() => setOpen((v) => !v)}
              className={`flex items-center gap-3 rounded-full pl-1 pr-4 py-1 transition-all duration-300 ${
                open
                  ? "bg-gradient-to-r from-[#EF3340] to-[#FF5560] shadow-lg shadow-red-500/30 scale-105 pulse-ring"
                  : "bg-white border-2 border-gray-200 hover:border-[#EF3340]/50 hover:shadow-md hover:scale-105"
              }`}
              aria-haspopup="menu"
              aria-expanded={open}
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
                  open ? "text-white" : "text-gray-700"
                }`}
              >
                {displayName}
              </span>
              <ChevronDown
                size={16}
                className={`transition-all duration-300 ${
                  open ? "rotate-180 text-white" : "text-gray-500"
                }`}
              />
            </button>

            {open && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute right-0 mt-3 w-64 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden slide-down"
              >
                <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EF3340] to-[#C82333] flex items-center justify-center text-white font-bold shadow-lg">
                      {initials || <UserIcon size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{displayName}</div>
                      <div className="text-xs text-gray-600 truncate">{me?.phone ?? ""}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    setConfirmOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 transition-all duration-200 group"
                  role="menuitem"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                    <LogOut size={16} className="text-gray-600 group-hover:text-[#EF3340] transition-colors" />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 scale-in"
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 border-b border-gray-200">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#EF3340] to-[#C82333] flex items-center justify-center shadow-lg pulse-ring">
                <LogOut size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-center text-gray-900">Confirm Logout</h2>
            </div>
            <div className="p-6 text-center text-gray-600">
              Are you sure you want to logout from your account?
            </div>
            <div className="p-6 bg-gray-50 flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-6 py-2.5 rounded-xl font-medium border-2 border-gray-300 hover:border-gray-400 hover:bg-white transition-all duration-200 hover:scale-105 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={doLogout}
                className="px-6 py-2.5 rounded-xl font-medium bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white hover:from-[#D82D39] hover:to-[#B01F2C] transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
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