"use client";

import { useEffect, useRef, useState } from "react";
import { Download, MessageCircle, MoreVertical, Phone as PhoneIcon, Share2 } from "lucide-react";
import Portal from "@/components/common/Portal";

type Props = {
  onShare: () => void | Promise<void>;
  onDownload: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
};

export default function KebabMenu({ onShare, onDownload, onCall, onWhatsApp }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  function place() {
    const btn = anchorRef.current;
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    const menuW = 180; // narrower on mobile
    const menuH = 160;
    const pad = 8;
    const gap = 6;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;

    let left = r.right - menuW + window.scrollX;
    let top = r.bottom + gap + window.scrollY;

    // clamp
    if (left < pad + window.scrollX) left = pad + window.scrollX;
    if (left + menuW > vpW - pad + window.scrollX) left = vpW - pad - menuW + window.scrollX;

    if (top + menuH > vpH - pad + window.scrollY) {
      // place above
      top = r.top - menuH - gap + window.scrollY;
      if (top < pad + window.scrollY) top = pad + window.scrollY;
    }
    return { top, left };
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setPos(place());
    setOpen(true);
  }

  // close on outside / esc / scroll
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      const inBtn = anchorRef.current?.contains(t);
      const inMenu = menuRef.current?.contains(t);
      if (!inBtn && !inMenu) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onScroll = () => {
      setPos(place());
    };
    document.addEventListener("click", onDoc, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("click", onDoc, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={anchorRef}
        onClick={toggle}
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        title="More"
        type="button"
      >
        <MoreVertical size={16} className="text-slate-700" />
      </button>

      {open && (
        <Portal>
          <div className="fixed inset-0 z-[199] bg-transparent" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            className="fixed z-[200] rounded-xl border border-slate-200 bg-white shadow-xl w-[180px] overflow-hidden"
            style={{ top: pos?.top ?? 0, left: pos?.left ?? 0 }}
          >
            <button
              onClick={() => { setOpen(false); onShare(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
              type="button"
            >
              <Share2 size={14} /> Share (WA/SMS)
            </button>
            <button
              onClick={() => { setOpen(false); onDownload(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
              type="button"
            >
              <Download size={14} /> Download PDF
            </button>
            <button
              onClick={() => { setOpen(false); onCall(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
              type="button"
            >
              <PhoneIcon size={14} /> Call
            </button>
            <button
              onClick={() => { setOpen(false); onWhatsApp(); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
              type="button"
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
          </div>
        </Portal>
      )}
    </>
  );
}
