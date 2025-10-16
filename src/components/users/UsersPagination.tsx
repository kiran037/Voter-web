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

  return (
    <div className="flex items-center justify-between bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 px-3 py-3 sm:px-6 sm:py-4">
      <div className="text-xs sm:text-sm text-slate-600">
        Showing <span className="font-semibold">{(page - 1) * limit + 1}</span> to{" "}
        <span className="font-semibold">{Math.min(page * limit, total)}</span> of{" "}
        <span className="font-semibold">{total}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="flex items-center gap-1 px-3 py-2 sm:px-4 rounded-md sm:rounded-lg border border-slate-300 hover:border-[#EF3340]/60 hover:bg-slate-50 disabled:opacity-50 transition-all text-xs sm:text-sm"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <div className="flex items-center px-3 py-2 bg-slate-50 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200">
          Page {page} of {totalPages}
        </div>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="flex items-center gap-1 px-3 py-2 sm:px-4 rounded-md sm:rounded-lg border border-slate-300 hover:border-[#EF3340]/60 hover:bg-slate-50 disabled:opacity-50 transition-all text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
