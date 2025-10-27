///Users/xeoren/voter-web/src/components/home/Modal.tsx
"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { PropsWithChildren } from "react";

export default function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
  wide?: boolean;
}>) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevActiveRef = useRef<HTMLElement | null>(null);

  // Close on ESC, lock background scroll, manage focus trap
  useEffect(() => {
    if (!open) return;

    // remember previously focused element
    prevActiveRef.current = document.activeElement as HTMLElement;

    // lock scroll
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // focus close button (or first focusable)
    const toFocus =
      closeBtnRef.current ||
      (dialogRef.current?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      ) ?? null);
    toFocus?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        // very small focus trap
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
        if (!focusables || focusables.length === 0) return;
        const list = Array.from(focusables).filter((el) => !el.hasAttribute("disabled"));
        const first = list[0];
        const last = list[list.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      // restore focus
      prevActiveRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.98) }
          to { opacity: 1; transform: translateY(0) scale(1) }
        }
        .fade-in { animation: fadeIn 0.2s ease-out both }
        .slide-up { animation: slideUp 0.28s cubic-bezier(.2,.8,.2,1) both }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm fade-in"
        role="presentation"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-[51] flex items-center justify-center p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          onClick={(e) => e.stopPropagation()}
          className={`w-full ${
            wide ? "max-w-5xl" : "max-w-2xl"
          } rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden slide-up`}
          style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
        >
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
            <h2 id={titleId} className="text-base sm:text-lg font-bold text-slate-900">
              {title}
            </h2>
            <button
              ref={closeBtnRef}
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
              aria-label="Close dialog"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
