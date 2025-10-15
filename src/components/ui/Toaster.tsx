// src/components/ui/Toaster.tsx
"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-slate-200 shadow-lg bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80",
          title: "font-semibold text-slate-900",
          description: "text-slate-600",
          actionButton:
            "rounded-lg bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white font-semibold px-3 py-1.5",
          cancelButton:
            "rounded-lg border border-slate-300 bg-white font-medium px-3 py-1.5",
          closeButton:
            "text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg",
          icon:
            "rounded-lg ring-1 ring-black/5 shadow bg-white",
        },
      }}
    />
  );
}
