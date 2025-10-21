///Users/xeoren/voter-web/src/components/home/Modal.tsx
"use client";

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
  if (!open) return null;

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.2s ease-out; }
        .slide-up { animation: slideUp 0.3s ease-out; }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 fade-in"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className={`w-full ${wide ? "max-w-5xl" : "max-w-2xl"} rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden slide-up`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  );
}
