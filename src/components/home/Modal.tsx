///Users/xeoren/voter-web/src/components/home/Modal.tsx
"use client";

import { useEffect, useId, useRef, PropsWithChildren } from "react";
import { X } from "lucide-react";

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

  useEffect(() => {
    if (!open) return;

    prevActiveRef.current = document.activeElement as HTMLElement;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

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
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      prevActiveRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-[1000] min-h-[100dvh] bg-black/40 backdrop-blur-sm sm:backdrop-blur-md"
        role="presentation"
        onClick={onClose}
      />

      {/* Dialog container */}
      <div
        className="fixed inset-0 z-[1001] min-h-[100dvh] flex items-center justify-center p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={onClose}
      >
        <div
          ref={dialogRef}
          onClick={(e) => e.stopPropagation()}
          className={`w-full ${wide ? "max-w-5xl" : "max-w-2xl"} 
            rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden
            transition-transform duration-200 ease-out
          `}
          data-state="open"
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
              type="button"
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
