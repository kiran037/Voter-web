///Users/xeoren/voter-web/src/components/shared/Modal.tsx
"use client";

import { X } from "lucide-react";
import { ReactNode } from "react";

export default function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.18s ease-out; }
        .slide-up { animation: slideUp 0.24s ease-out; }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 fade-in"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className={`w-full ${
            wide ? "max-w-4xl sm:max-w-5xl" : "max-w-lg sm:max-w-2xl"
          } rounded-t-2xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden slide-up`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm sm:text-lg font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-3 sm:p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  );
}
