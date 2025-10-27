///Users/xeoren/voter-web/src/components/shared/Modal.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
};

export default function Modal({ open, title, onClose, children, wide }: Props) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const titleIdRef = useRef(`modal-title-${Math.random().toString(36).slice(2)}`);

  // Mount portal only on client
  useEffect(() => setMounted(true), []);

  // Body scroll lock + ESC to close + restore focus
  useEffect(() => {
    if (!open) return;

    // remember previously focused element
    prevFocusRef.current = document.activeElement as HTMLElement | null;

    // lock scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // ESC handler
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") trapFocus(e);
    }
    document.addEventListener("keydown", onKey);

    // initial focus
    const t = setTimeout(() => {
      const focusable = getFocusable(panelRef.current);
      (focusable[0] as HTMLElement | undefined)?.focus?.();
      if (!focusable.length) closeBtnRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      // restore focus
      prevFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus trap helper
  function trapFocus(e: KeyboardEvent) {
    const root = panelRef.current;
    if (!root) return;
    const focusable = getFocusable(root);
    if (!focusable.length) return;

    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Click on backdrop to close
  function onBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    // clicks on the shaded backdrop, not the panel
    if (e.target === e.currentTarget) onClose();
  }

  if (!open || !mounted) return null;

  const maxW = wide ? "max-w-4xl sm:max-w-5xl" : "max-w-lg sm:max-w-2xl";

  return createPortal(
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.18s ease-out; }
        .slide-up { animation: slideUp 0.24s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .fade-in, .slide-up { animation: none; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleIdRef.current}
        onMouseDown={onBackdropClick}
      >
        {/* Panel */}
        <div
          ref={panelRef}
          className={`w-full ${maxW} rounded-t-2xl sm:rounded-3xl bg-white shadow-2xl border border-gray-200 overflow-hidden slide-up`}
          // prevent backdrop close when clicking inside
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Drag handle on mobile */}
          <div className="sm:hidden h-6 flex items-center justify-center">
            <div className="h-1.5 w-12 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex items-center justify-between">
            <h2 id={titleIdRef.current} className="text-sm sm:text-lg font-bold text-gray-900">
              {title}
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#EF3340]/30 focus:ring-offset-2 focus:ring-offset-white flex items-center justify-center transition"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6 max-h-[70vh] overflow-y-auto overscroll-contain">
            {children}
          </div>

          {/* Safe-area padding for iOS bottom */}
          <div className="pb-[max(0px,env(safe-area-inset-bottom))]" />
        </div>
      </div>
    </>,
    document.body
  );
}

/* Utilities */
function getFocusable(root: HTMLElement | null): Element[] {
  if (!root) return [];
  const SEL =
    'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
  const nodes = Array.from(root.querySelectorAll(SEL));
  return nodes.filter((el) => {
    const style = window.getComputedStyle(el as Element);
    return style.visibility !== "hidden" && style.display !== "none";
  });
}
