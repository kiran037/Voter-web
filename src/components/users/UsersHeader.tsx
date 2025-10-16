// src/components/users/UsersHeader.tsx
"use client";

import { Plus, Search } from "lucide-react";

export default function UsersHeader({
  total,
  q,
  setQ,
  onAdd,
}: {
  total: number;
  q: string;
  setQ: (v: string) => void;
  onAdd: () => void;
}) {
  const headerCount = total ? (
    <span className="ml-2 text-white/90 text-sm bg-white/10 px-2 py-0.5 rounded-md border border-white/20">{total}</span>
  ) : null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#EF3340] via-[#E02030] to-[#C82333] rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-red-500/20">
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
      <div className="absolute -right-20 -top-20 w-56 h-56 sm:w-72 sm:h-72 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -left-20 -bottom-20 w-56 h-56 sm:w-72 sm:h-72 bg-black/5 rounded-full blur-3xl" />
      <div className="relative p-4 sm:p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Users{headerCount}
            </h1>
            <p className="text-white/80 mt-0.5 sm:mt-1 text-sm sm:text-base">Manage application users</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-white/90 backdrop-blur-xl text-[#EF3340] rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-white hover:shadow-xl transition-all border border-white/50"
            >
              <Plus size={18} />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 sm:mt-4 bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/60 p-3 sm:p-4 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-slate-300 focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none text-sm sm:text-base"
              placeholder="Search by phone or name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
