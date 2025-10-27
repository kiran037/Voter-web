// src/components/ui/Toaster.tsx
"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <>
      <style jsx global>{`
        @keyframes toastInRight {
          from { opacity: 0; transform: translate3d(12px, 0, 0) scale(0.98); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes toastOutRight {
          from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
          to { opacity: 0; transform: translate3d(12px, 0, 0) scale(0.98); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes toastInRight { from { opacity: 0; } to { opacity: 1; } }
          @keyframes toastOutRight { from { opacity: 1; } to { opacity: 0; } }
        }
      `}</style>

      <Toaster
        position="top-right"
        richColors
        expand
        closeButton
        visibleToasts={5}
        theme="light"
        toastOptions={{
          duration: 4200,
          style: {
            animation: "toastInRight 260ms cubic-bezier(0.21, 1.02, 0.73, 1) forwards",
          },
          classNames: {
            toast:
              // card shell
              "group relative overflow-hidden rounded-2xl border border-slate-200/70 " +
              "bg-white/90 backdrop-blur-xl shadow-2xl transition-all duration-300 " +
              "hover:shadow-[0_12px_32px_rgba(16,24,40,0.12)] hover:scale-[1.01] " +
              // subtle light sheen on hover
              "before:absolute before:inset-0 before:pointer-events-none " +
              "before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)] " +
              "before:bg-[length:200%_100%] before:opacity-0 group-hover:before:opacity-100 " +
              "before:animate-[shine_900ms_ease-out_1]",
            title:
              "font-bold text-slate-900 tracking-tight text-[0.95rem] leading-snug",
            description:
              "text-slate-600 mt-1 text-[0.9rem] leading-relaxed",
            icon:
              "rounded-xl ring-2 ring-white/60 shadow-lg p-1 " +
              "bg-gradient-to-br from-white to-slate-50 transition-transform " +
              "duration-300 group-hover:scale-110 group-hover:rotate-3",
            closeButton:
              "absolute top-2.5 right-2.5 rounded-lg p-1.5 text-slate-400 " +
              "hover:text-slate-700 hover:bg-slate-100/80 transition-all " +
              "duration-200 hover:rotate-90 active:scale-95",
            actionButton:
              "relative overflow-hidden rounded-xl px-4 py-2 font-semibold text-white " +
              "bg-gradient-to-r from-[#EF3340] via-[#E02838] to-[#C82333] shadow-lg " +
              "transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 " +
              "before:absolute before:inset-0 before:bg-white/20 before:translate-y-full " +
              "hover:before:translate-y-0 before:transition-transform before:duration-300",
            cancelButton:
              "rounded-xl border-2 border-slate-200 bg-white/80 backdrop-blur " +
              "font-semibold px-4 py-2 transition-all duration-300 " +
              "hover:bg-slate-50 hover:border-slate-300 hover:scale-105 active:scale-95 shadow-sm",
            // type accents (soft tinted backgrounds + border harmony)
            success:
              "border-emerald-200/60 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),transparent)]",
            error:
              "border-rose-200/60 bg-[linear-gradient(180deg,rgba(244,63,94,0.08),transparent)]",
            warning:
              "border-amber-200/60 bg-[linear-gradient(180deg,rgba(245,158,11,0.1),transparent)]",
            info:
              "border-blue-200/60 bg-[linear-gradient(180deg,rgba(59,130,246,0.08),transparent)]",
          },
          // exit animation
          unstyled: false,
        }}
        // container tweaks (spacing around stack)
        offset={14}
        gap={10}
      />
    </>
  );
}
