// src/components/ui/Modal.tsx
"use client";

export default function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.2s ease-out; }
        .slide-up { animation: slideUp 0.3s ease-out; }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 fade-in"
        onClick={onClose}
      >
        <div
          className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden slide-up`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <button className="w-8 h-8 rounded-lg hover:bg-slate-100" onClick={onClose}>✕</button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  );
}
