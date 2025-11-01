"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  Upload,
  X,
  ChevronDown,
  Trash2,
} from "lucide-react";
import type { ColourCode, VoterListItem } from "@/types/voter";

import VotersTable from "@/components/home/VotersTable";
import AddVoterModal from "@/components/home/AddVoterModal";
import ImportModal from "@/components/home/ImportModal";
import DeleteConfirmModal from "@/components/home/DeleteConfirmModal";

const LIMIT = 50;

export default function HomeClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  // ---------- auth/role ----------
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/me", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json().catch(() => ({}));
        const role = j?.user?.role ?? "STAFF";
        if (!cancelled) setIsAdmin(role === "ADMIN");
      } catch { }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- query state (synced to URL) ----------
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [colourCode, setColourCode] = useState<"" | ColourCode>(
    (sp.get("colourCode") as ColourCode) || ""
  );
  const [voted, setVoted] = useState<"" | "1" | "0">(
    sp.get("voted") === "1" ? "1" : sp.get("voted") === "0" ? "0" : ""
  );
  const [starVoter, setStarVoter] = useState<"" | "1" | "0">(
    sp.get("starVoter") === "1" ? "1" : sp.get("starVoter") === "0" ? "0" : ""
  );
  const [dead, setDead] = useState<"" | "1" | "0">(
    sp.get("dead") === "1" ? "1" : sp.get("dead") === "0" ? "0" : ""
  );
  const [boothNo, setBoothNo] = useState<string>(sp.get("boothNo") ?? "");
  const [page, setPage] = useState<number>(Math.max(1, Number(sp.get("page") || "1")));

  // refs
  const searchRef = useRef<HTMLInputElement>(null);

  // ---------- data ----------
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<VoterListItem[]>([]);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LIMIT)), [total]);

  // ---------- debounce for search ----------
  const debounceRef = useRef<number | null>(null);
  const [debouncedQ, setDebouncedQ] = useState(q.trim());

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const next = q.trim();
      setDebouncedQ(next);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  // ---------- sync state -> URL ----------
  useEffect(() => {
    const usp = new URLSearchParams();
    if (debouncedQ) usp.set("q", debouncedQ);
    if (colourCode) usp.set("colourCode", colourCode);
    if (voted) usp.set("voted", voted);
    if (starVoter) usp.set("starVoter", starVoter);
    if (dead) usp.set("dead", dead);
    if (boothNo) usp.set("boothNo", boothNo);
    usp.set("page", String(page));
    const qs = usp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [debouncedQ, colourCode, voted, starVoter, dead, boothNo, page, router, pathname]);

  // ---------- fetch list (with race guard) ----------
  const activeReqId = useRef(0);
  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const reqId = ++activeReqId.current;
      try {
        const usp = new URLSearchParams();
        usp.set("limit", String(LIMIT));
        usp.set("page", String(page));
        if (debouncedQ) usp.set("q", debouncedQ);
        if (colourCode) usp.set("colourCode", colourCode);
        if (voted) usp.set("voted", voted);
        if (starVoter) usp.set("starVoter", starVoter);
        if (dead) usp.set("dead", dead);
        if (boothNo) usp.set("boothNo", boothNo);

        const res = await fetch(`/api/voters?${usp.toString()}`, { cache: "no-store", signal });
        const j = await res.json().catch(() => ({}));
        if (reqId !== activeReqId.current) return; // stale response, ignore

        if (res.ok) {
          setItems(Array.isArray(j.items) ? j.items : []);
          setTotal(Number.isFinite(j.total) ? j.total : 0);
        } else {
          setItems([]);
          setTotal(0);
        }
      } catch {
        if (!signal?.aborted) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [debouncedQ, colourCode, voted, starVoter, dead, boothNo, page]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    loadList(ctrl.signal);
    return () => ctrl.abort();
  }, [loadList]);

  // ---- local patch helpers (no full reload) ----
  const patchItem = useCallback((id: string | number, patch: Partial<VoterListItem>) => {
    const key = String(id);
    setItems((prev) => prev.map((it) => (String(it.id) === key ? { ...it, ...patch } : it)));
  }, []);

  const removeItems = useCallback((ids: string[]) => {
    const keys = new Set(ids.map(String));
    setItems((prev) => prev.filter((it) => !keys.has(String(it.id))));
    setTotal((t) => Math.max(0, t - ids.length));
  }, []);

  // ---------- modals ----------
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  const activeFilters = [colourCode, voted, starVoter, dead, boothNo].filter(Boolean).length;

  // ---------- keyboard shortcuts (safe) ----------
  useEffect(() => {
    function inFormField(el: EventTarget | null) {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = (t.tagName || "").toUpperCase();
      // also ignore contenteditable
      const ce = (t as HTMLElement).closest("[contenteditable=''],[contenteditable='true']");
      return ["INPUT", "TEXTAREA", "SELECT"].includes(tag) || !!ce;
    }

    function onKey(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      const meta = e.metaKey || e.ctrlKey;

      // focus search
      if ((k === "/" && !meta) || (meta && k === "k")) {
        if (inFormField(e.target)) return;
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // admin only: n = new, r = refresh (but NOT inside inputs)
      if (!isAdmin) return;

      if (k === "n" && !meta && !inFormField(e.target)) {
        e.preventDefault();
        setAddOpen(true);
        return;
      }

      if (k === "r" && !meta && !inFormField(e.target)) {
        e.preventDefault();
        const ctrl = new AbortController();
        loadList(ctrl.signal);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, loadList]);

  // ---------- mobile filters collapse ----------
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ---------------- UI ----------------
  return (
    <main className="mx-auto w-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero / Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#EF3340] via-[#E02030] to-[#C82333] rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-red-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
        <div className="absolute -right-20 -top-20 w-56 h-56 sm:w-72 sm:h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -left-20 -bottom-20 w-56 h-56 sm:w-72 sm:h-72 bg-black/5 rounded-full blur-3xl" />

        <div className="relative p-4 sm:p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                Voters Database
              </h1>
              <p className="text-white/80 mt-0.5 sm:mt-1 text-sm sm:text-base">
                Manage, search and maintain your voter records
              </p>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-white/90 backdrop-blur-xl text-[#EF3340] rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-white hover:shadow-xl transition-all border border-white/50"
                >
                  <Plus size={18} />
                  <span>Add</span>
                </button>
                <button
                  onClick={() => setImportOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-white/90 backdrop-blur-xl text-slate-800 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-white hover:shadow-xl transition-all border border-white/50"
                >
                  <Upload size={18} />
                  <span>Bulk</span>
                </button>
                <button
                  onClick={() => setDeleteAllOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-white/90 backdrop-blur-xl text-rose-600 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-white hover:shadow-xl transition-all border border-white/50"
                >
                  <Trash2 size={18} />
                  <span className="hidden sm:inline">Delete All</span>
                  <span className="sm:hidden">All</span>
                </button>
              </div>
            )}
          </div>

          {/* Search + Filters */}
          <div className="mt-3 sm:mt-4 bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/60 p-3 sm:p-4 shadow-lg">
            {/* Search */}
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                ref={searchRef}
                className="w-full h-10 sm:h-11 pl-10 sm:pl-12 pr-10 sm:pr-12 rounded-lg sm:rounded-xl border border-slate-300 focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none text-sm sm:text-base"
                placeholder="Search by name, village, voter ID, phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-500"
                  aria-label="Clear search"
                  title="Clear"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            {/* Filters header (mobile collapse) */}
            <button
              className="mt-3 w-full flex items-center justify-between rounded-md sm:hidden border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
            >
              <span className="flex items-center gap-2">
                <Filter size={16} />
                Filters
                {activeFilters > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-[#EF3340] text-white rounded-full text-[10px]">
                    {activeFilters}
                  </span>
                )}
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Filters row */}
            <div
              className={`mt-3 ${filtersOpen ? "block" : "hidden sm:block"
                }`}
            >
              <div className="sm:flex sm:flex-nowrap sm:items-center sm:gap-2 overflow-x-auto sm:overflow-visible scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {/* Colour code */}
                <select
                  className="min-w-[9rem] px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#EF3340] focus:outline-none text-xs sm:text-sm"
                  value={colourCode}
                  onChange={(e) => { setColourCode(e.target.value as ColourCode | ""); setPage(1); }}
                >
                  <option value="">All</option>
                  <option value="OUR">Our</option>
                  <option value="OPPOSITE">Opposite</option>
                  <option value="DOUBTFUL">Doubtful</option>
                  <option value="OTHER">Other</option>
                </select>

                {/* Voted */}
                <select
                  className="min-w-[10rem] px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#EF3340] focus:outline-none text-xs sm:text-sm"
                  value={voted}
                  onChange={(e) => { setVoted(e.target.value as "1" | "0" | ""); setPage(1); }}
                >
                  <option value="">Voted: All</option>
                  <option value="1">Voted</option>
                  <option value="0">Not Voted</option>
                </select>

                {/* Star voter */}
                <select
                  className="min-w-[9rem] px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#EF3340] focus:outline-none text-xs sm:text-sm"
                  value={starVoter}
                  onChange={(e) => { setStarVoter(e.target.value as "1" | "0" | ""); setPage(1); }}
                >
                  <option value="">Star: All</option>
                  <option value="1">Star Voters</option>
                  <option value="0">Regular</option>
                </select>

                {/* Status */}
                <select
                  className="min-w-[10rem] px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#EF3340] focus:outline-none text-xs sm:text-sm"
                  value={dead}
                  onChange={(e) => { setDead(e.target.value as "1" | "0" | ""); setPage(1); }}
                >
                  <option value="">Status: All</option>
                  <option value="0">Alive</option>
                  <option value="1">Deceased</option>
                </select>

                {/* Booth No. */}
                <input
                  className="min-w-[8rem] px-2.5 py-1.5 sm:px-3 sm:py-2 border border-slate-300 rounded-md sm:rounded-lg focus:border-[#EF3340] focus:outline-none text-xs sm:text-sm"
                  placeholder="Booth No."
                  inputMode="numeric"
                  value={boothNo}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setBoothNo(digits);
                    setPage(1);
                  }}
                />

                {activeFilters > 0 && (
                  <button
                    onClick={() => {
                      setColourCode("");
                      setVoted("");
                      setStarVoter("");
                      setDead("");
                      setBoothNo("");
                      setPage(1);
                    }}
                    className="ml-auto shrink-0 px-2.5 py-1.5 text-xs sm:text-sm text-[#EF3340] hover:bg-rose-50 rounded-md sm:rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Table */}
      <VotersTable
        items={items}
        loading={loading}
        onDeleteAsk={(id) => setDeleteId(id)}
        isAdmin={isAdmin}
        onPatch={patchItem}
        onRemoveMany={removeItems}
      />

      {/* Pagination */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 px-3 py-3 sm:px-6 sm:py-4">
          <div className="text-xs sm:text-sm text-slate-600">
            Showing <span className="font-semibold">{(page - 1) * LIMIT + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(page * LIMIT, total)}</span> of{" "}
            <span className="font-semibold">{total}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-2 sm:px-4 rounded-md sm:rounded-lg border border-slate-300 hover:border-[#EF3340]/60 hover:bg-slate-50 disabled:opacity-50 transition-all text-xs sm:text-sm"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} className="sm:hidden" />
              <ChevronLeft size={18} className="hidden sm:block" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="flex items-center px-3 py-2 bg-slate-50 rounded-md sm:rounded-lg text-xs sm:text-sm font-semibold text-slate-700 border border-slate-200">
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-2 sm:px-4 rounded-md sm:rounded-lg border border-slate-300 hover:border-[#EF3340]/60 hover:bg-slate-50 disabled:opacity-50 transition-all text-xs sm:text-sm"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={16} className="sm:hidden" />
              <ChevronRight size={18} className="hidden sm:block" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddVoterModal
        open={isAdmin && addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={async () => {
          setPage(1);
          await loadList();
        }}
      />
      <ImportModal
        open={isAdmin && importOpen}
        onClose={() => setImportOpen(false)}
        onImported={async () => {
          setPage(1);
          await loadList();
        }}
      />
      <DeleteConfirmModal
        id={deleteId || undefined}
        open={isAdmin && !!deleteId}
        onClose={() => setDeleteId(null)}
        onDeleted={async () => {
          if (!deleteId) return;
          removeItems([deleteId]);
          setDeleteId(null);
          // If page becomes empty after delete, pull previous page
          const remaining = items.length - 1;
          if (remaining <= 0 && page > 1) {
            setPage((p) => Math.max(1, p - 1));
            const ctrl = new AbortController();
            loadList(ctrl.signal);
          }
        }}
      />
      <DeleteConfirmModal
        deleteAll
        open={isAdmin && deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        onDeleted={async () => {
          setDeleteAllOpen(false);
          setPage(1);
          await loadList();
        }}
      />
    </main>
  );
}