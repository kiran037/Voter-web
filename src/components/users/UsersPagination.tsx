// src/components/users/UsersPagination.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function UsersPagination({
  page,
  total,
  limit,
  onPrev,
  onNext,
}: {
  page: number;
  total: number;
  limit: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 px-3 py-3 sm:px-6 sm:py-4"
    >
      {/* Range summary */}
      <div className="text-xs sm:text-sm text-slate-600">
        Showing{" "}
        <span className="font-semibold text-slate-900">{from}</span> –{" "}
        <span className="font-semibold text-slate-900">{to}</span> of{" "}
        <span className="font-bold text-slate-900">{total}</span>
        <span className="ml-2 inline-flex items-center rounded-md border border-[#EF3340]/20 bg-[#EF3340]/5 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-[#EF3340]">
          Page {page}/{totalPages}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={prevDisabled}
          title="Previous page"
          aria-label="Previous page"
          className={`group inline-flex items-center gap-1.5 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border transition-all
            ${prevDisabled
              ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              : "border-slate-300 hover:border-[#EF3340]/60 hover:bg-slate-50 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF3340]/40"
            }`}
        >
          <ChevronLeft size={18} className={!prevDisabled ? "group-hover:-translate-x-0.5 transition-transform" : ""} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Pill showing current page */}
        <div
          className="inline-flex items-center justify-center rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold
                     border border-slate-200 bg-slate-50 text-slate-700 select-none"
          aria-live="polite"
        >
          Page {page}
          <span className="mx-1 text-slate-400">/</span>
          {totalPages}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          title="Next page"
          aria-label="Next page"
          className={`group inline-flex items-center gap-1.5 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border transition-all
            ${nextDisabled
              ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
              : "border-slate-300 hover:border-[#EF3340]/60 hover:bg-slate-50 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF3340]/40"
            }`}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={18} className={!nextDisabled ? "group-hover:translate-x-0.5 transition-transform" : ""} />
        </button>
      </div>
    </nav>
  );
}
