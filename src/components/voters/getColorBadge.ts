// src/components/voters/getColorBadge.ts
import type { ColourCode } from "@/types/voter";

export function getColorBadge(code: ColourCode) {
  const styles = {
    OUR: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    OPPOSITE: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    DOUBTFUL: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    OTHER: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  } as const;
  return styles[code] || styles.OTHER;
}
