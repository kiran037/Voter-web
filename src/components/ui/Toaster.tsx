
// src/components/ui/Toaster.tsx
"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      expand={true}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group relative overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-3xl before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
          title: "font-bold text-slate-900 tracking-tight",
          description: "text-slate-600 mt-1 leading-relaxed",
          actionButton:
            "relative overflow-hidden rounded-xl bg-gradient-to-r from-[#EF3340] via-[#E02838] to-[#C82333] text-white font-bold px-4 py-2 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 before:absolute before:inset-0 before:bg-white/20 before:translate-y-full hover:before:translate-y-0 before:transition-transform before:duration-300",
          cancelButton:
            "rounded-xl border-2 border-slate-200 bg-white/80 backdrop-blur font-semibold px-4 py-2 transition-all duration-300 hover:bg-slate-50 hover:border-slate-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md",
          closeButton:
            "absolute top-3 right-3 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-lg transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-90",
          icon:
            "rounded-xl ring-2 ring-white/50 shadow-lg bg-gradient-to-br from-white to-slate-50 p-1 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6",
          success: "border-emerald-200/50 bg-gradient-to-br from-emerald-50/95 to-white/90",
          error: "border-rose-200/50 bg-gradient-to-br from-rose-50/95 to-white/90",
          warning: "border-amber-200/50 bg-gradient-to-br from-amber-50/95 to-white/90",
          info: "border-blue-200/50 bg-gradient-to-br from-blue-50/95 to-white/90",
        },
        style: {
          animation: "slideIn 0.3s cubic-bezier(0.21, 1.02, 0.73, 1) forwards",
        },
      }}
    />
  );
}