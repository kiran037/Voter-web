// src/app/(home)/HomeClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Plus, Upload, X, ChevronLeft, ChevronRight, Filter, Eye, Trash2, CheckCircle, Star, User, Skull } from "lucide-react";

type Gender = "M" | "F" | "O";
type ColourCode = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";

type VoterListItem = {
  id: string;
  name: string;
  voterId: string | null;
  village: string | null;
  boothNo: number | null;
  partNo: number | null;
  srn: number | null;
  mobile1: string | null;
  colourCode: ColourCode;
  voted: boolean;
  starVoter: boolean;
  dead: boolean;
  updatedAt: string;
};

const LIMIT = 50;

// ---------------- Modal ----------------
function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .fade-in { animation: fadeIn 0.2s ease-out; }
        .slide-up { animation: slideUp 0.3s ease-out; }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 fade-in"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className={`w-full ${wide ? "max-w-5xl" : "max-w-2xl"} rounded-3xl bg-white shadow-2xl overflow-hidden slide-up`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  );
}

export default function HomeClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

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
  const [page, setPage] = useState<number>(Math.max(1, Number(sp.get("page") || "1")));

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
      setDebouncedQ(q.trim());
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
    usp.set("page", String(page));
    router.replace(`${pathname}?${usp.toString()}`);
  }, [debouncedQ, colourCode, voted, starVoter, dead, page, router, pathname]);

  // ---------- fetch list ----------
  async function loadList(signal?: AbortSignal) {
    setLoading(true);
    try {
      const usp = new URLSearchParams();
      usp.set("limit", String(LIMIT));
      usp.set("page", String(page));
      if (debouncedQ) usp.set("q", debouncedQ);
      if (colourCode) usp.set("colourCode", colourCode);
      if (voted) usp.set("voted", voted);
      if (starVoter) usp.set("starVoter", starVoter);
      if (dead) usp.set("dead", dead);

      const res = await fetch(`/api/voters?${usp.toString()}`, {
        cache: "no-store",
        signal,
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems(j.items ?? []);
        setTotal(j.total ?? 0);
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
      setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    loadList(ctrl.signal);
    return () => ctrl.abort();
  }, [debouncedQ, colourCode, voted, starVoter, dead, page]);

  // ---------- add modal state ----------
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    voterId: "",
    age: "",
    gender: "" as "" | Gender,
    village: "",
    houseNo: "",
    address: "",
    boothName: "",
    boothNo: "",
    partNo: "",
    srn: "",
    mobile1: "",
    mobile2: "",
    email: "",
    colourCode: "" as "" | ColourCode,
    voted: false,
    starVoter: false,
    dead: false,
    caste: "",
    profession: "",
    personnel: "",
    society: "",
    flatNo: "",
    newAddress: "",
    demands: "",
    extraInfo1: "",
    extraInfo2: "",
    extraInfo3: "",
    extraInfo4: "",
    extraInfo5: "",
    extraCheck1: false,
    extraCheck2: false,
    dob: "",
  });
  function setF<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddErr(null);
    try {
      const payload: any = {
        name: form.name.trim(),
        voterId: form.voterId.trim() || null,
        age: form.age ? Number(form.age) : null,
        gender: form.gender || null,
        village: form.village.trim() || null,
        houseNo: form.houseNo.trim() || null,
        address: form.address.trim() || null,
        boothName: form.boothName.trim() || null,
        boothNo: form.boothNo ? Number(form.boothNo) : null,
        partNo: form.partNo ? Number(form.partNo) : null,
        srn: form.srn ? Number(form.srn) : null,
        mobile1: form.mobile1.trim() || null,
        mobile2: form.mobile2.trim() || null,
        email: form.email.trim() || null,
        colourCode: (form.colourCode || "OTHER") as ColourCode,
        voted: !!form.voted,
        starVoter: !!form.starVoter,
        dead: !!form.dead,
        caste: form.caste.trim() || null,
        profession: form.profession.trim() || null,
        personnel: form.personnel.trim() || null,
        society: form.society.trim() || null,
        flatNo: form.flatNo.trim() || null,
        newAddress: form.newAddress.trim() || null,
        demands: form.demands.trim() || null,
        extraInfo1: form.extraInfo1.trim() || null,
        extraInfo2: form.extraInfo2.trim() || null,
        extraInfo3: form.extraInfo3.trim() || null,
        extraInfo4: form.extraInfo4.trim() || null,
        extraInfo5: form.extraInfo5.trim() || null,
        extraCheck1: form.extraCheck1,
        extraCheck2: form.extraCheck2,
        dob: form.dob || null,
      };

      const res = await fetch("/api/voters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.replace("/signin?next=/");
        return;
      }

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddErr(j?.error || "Failed to create");
        return;
      }

      setForm({
        name: "",
        voterId: "",
        age: "",
        gender: "",
        village: "",
        houseNo: "",
        address: "",
        boothName: "",
        boothNo: "",
        partNo: "",
        srn: "",
        mobile1: "",
        mobile2: "",
        email: "",
        colourCode: "",
        voted: false,
        starVoter: false,
        dead: false,
        caste: "",
        profession: "",
        personnel: "",
        society: "",
        flatNo: "",
        newAddress: "",
        demands: "",
        extraInfo1: "",
        extraInfo2: "",
        extraInfo3: "",
        extraInfo4: "",
        extraInfo5: "",
        extraCheck1: false,
        extraCheck2: false,
        dob: "",
      });
      setAddOpen(false);
      setPage(1);
      await loadList();
    } catch (e: any) {
      setAddErr(e?.message || "Failed to create");
    } finally {
      setAdding(false);
    }
  }

  // ---------- bulk upload modal ----------
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string>("");

  async function onImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = (e.currentTarget.elements.namedItem("file") as HTMLInputElement) || null;
    if (!fileInput?.files || fileInput.files.length === 0) {
      setImportMsg("Please choose a CSV/XLSX file.");
      return;
    }
    const file = fileInput.files[0];
    const fd = new FormData();
    fd.append("file", file);
    setImporting(true);
    setImportMsg("");
    try {
      const res = await fetch("/api/voters/import", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImportMsg(j.error || "Import failed");
      } else {
        setImportMsg(`✓ Imported: ${j.successCount} success, ${j.failedCount} failed out of ${j.rowCount} rows`);
        setPage(1);
        await loadList();
        fileInput.value = "";
      }
    } catch (e: any) {
      setImportMsg(e?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }

  // ---------- delete inline confirm ----------
  const [deleteIntent, setDeleteIntent] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  async function doDelete(id: string) {
    setDeleting(id);
    setDeleteErr(null);
    try {
      const res = await fetch(`/api/voters/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setDeleteErr(j.error || "Delete failed");
        return;
      }
      const remaining = items.length - 1;
      if (remaining <= 0 && page > 1) setPage(page - 1);
      await loadList();
      setDeleteIntent(null);
    } catch (e: any) {
      setDeleteErr(e?.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  const getColorBadge = (code: ColourCode) => {
    const styles = {
      OUR: "bg-green-100 text-green-700 border-green-200",
      OPPOSITE: "bg-red-100 text-red-700 border-red-200",
      DOUBTFUL: "bg-yellow-100 text-yellow-700 border-yellow-200",
      OTHER: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return styles[code] || styles.OTHER;
  };

  const activeFilters = [colourCode, voted, starVoter, dead].filter(Boolean).length;

  // ---------------- UI ----------------
  return (
    <main className="mx-auto w-full p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Voters Database</h1>
          <p className="text-gray-600 mt-1">{total} total voters across all booths</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all"
          >
            <Plus size={18} />
            <span>Add Voter</span>
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl font-medium hover:border-[#EF3340]/50 hover:shadow-md hover:scale-105 transition-all"
          >
            <Upload size={18} />
            <span>Bulk Upload</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none transition-colors"
            placeholder="Search by name, village, voter ID, phone number..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter size={16} />
            <span>Filters:</span>
            {activeFilters > 0 && (
              <span className="px-2 py-0.5 bg-[#EF3340] text-white rounded-full text-xs">
                {activeFilters}
              </span>
            )}
          </div>
          
          <select
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#EF3340] focus:outline-none text-sm"
            value={colourCode}
            onChange={(e) => { setColourCode(e.target.value as any); setPage(1); }}
          >
            <option value="">All</option>
            <option value="OUR">Our</option>
            <option value="OPPOSITE">Opposite</option>
            <option value="DOUBTFUL">Doubtful</option>
            <option value="OTHER">Other</option>
          </select>
          
          <select
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#EF3340] focus:outline-none text-sm"
            value={voted}
            onChange={(e) => { setVoted(e.target.value as any); setPage(1); }}
          >
            <option value="">Voted: All</option>
            <option value="1">Voted</option>
            <option value="0">Not Voted</option>
          </select>
          
          <select
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#EF3340] focus:outline-none text-sm"
            value={starVoter}
            onChange={(e) => { setStarVoter(e.target.value as any); setPage(1); }}
          >
            <option value="">Star: All</option>
            <option value="1">Star Voters</option>
            <option value="0">Regular</option>
          </select>
          
          <select
            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-[#EF3340] focus:outline-none text-sm"
            value={dead}
            onChange={(e) => { setDead(e.target.value as any); setPage(1); }}
          >
            <option value="">Status: All</option>
            <option value="0">Alive</option>
            <option value="1">Deceased</option>
          </select>

          {activeFilters > 0 && (
            <button
              onClick={() => {
                setColourCode("");
                setVoted("");
                setStarVoter("");
                setDead("");
                setPage(1);
              }}
              className="ml-auto px-3 py-2 text-sm text-[#EF3340] hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#EF3340] rounded-full animate-spin" />
            <p className="mt-4 text-gray-600">Loading voters...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <User className="mx-auto text-gray-300" size={48} />
            <p className="mt-4 text-gray-600 font-medium">No voters found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Voter Info</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Voter's Side</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Voted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-gray-900">{it.name}</div>
                      {it.voterId && (
                        <div className="text-xs text-gray-500 mt-1">ID: {it.voterId}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {it.mobile1 ? (
                        <div className="text-sm text-gray-700">{it.mobile1}</div>
                      ) : (
                        <span className="text-sm text-gray-400">No contact</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700">{it.village || "-"}</div>
                      {(it.boothNo || it.partNo) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {it.boothNo && `Booth ${it.boothNo}`}
                          {it.boothNo && it.partNo && " • "}
                          {it.partNo && `Part ${it.partNo}`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${getColorBadge(it.colourCode)}`}>
                        {it.colourCode}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        {it.voted ? (
                          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center" title="Voted">
                            <CheckCircle size={18} className="text-green-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center" title="Not Voted">
                            <X size={18} className="text-red-600" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        {it.dead ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            Deceased
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                            Alive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/voters/${it.id}`}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} className="text-gray-600" />
                        </Link>
                        <button
                          onClick={() => setDeleteIntent(it.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && items.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-2xl border-2 border-gray-200 px-6 py-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{(page - 1) * LIMIT + 1}</span> to{" "}
            <span className="font-semibold">{Math.min(page * LIMIT, total)}</span> of{" "}
            <span className="font-semibold">{total}</span> voters
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border-2 border-gray-200 hover:border-[#EF3340]/50 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white transition-all"
            >
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <div className="flex items-center px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium">
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border-2 border-gray-200 hover:border-[#EF3340]/50 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-white transition-all"
            >
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ------------ Add Voter Modal ------------ */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Voter" wide>
        <form onSubmit={onAdd} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <input required className="col-span-full md:col-span-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Full Name *" value={form.name} onChange={(e) => setF("name", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Voter ID" value={form.voterId} onChange={(e) => setF("voterId", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Age" inputMode="numeric" value={form.age} onChange={(e) => setF("age", e.target.value.replace(/\D/g, ""))} />
              <select className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" value={form.gender} onChange={(e) => setF("gender", e.target.value as any)}>
                <option value="">Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Date of Birth" type="date" value={form.dob} onChange={(e) => setF("dob", e.target.value)} />
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Address Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Village" value={form.village} onChange={(e) => setF("village", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="House No." value={form.houseNo} onChange={(e) => setF("houseNo", e.target.value)} />
              <input className="col-span-full md:col-span-2 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Address" value={form.address} onChange={(e) => setF("address", e.target.value)} />
            </div>
          </div>

          {/* Booth Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Booth Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Booth Name" value={form.boothName} onChange={(e) => setF("boothName", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Booth No." inputMode="numeric" value={form.boothNo} onChange={(e) => setF("boothNo", e.target.value.replace(/\D/g, ""))} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Part No." inputMode="numeric" value={form.partNo} onChange={(e) => setF("partNo", e.target.value.replace(/\D/g, ""))} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="SRN" inputMode="numeric" value={form.srn} onChange={(e) => setF("srn", e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Mobile 1" value={form.mobile1} onChange={(e) => setF("mobile1", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Mobile 2" value={form.mobile2} onChange={(e) => setF("mobile2", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Email" value={form.email} onChange={(e) => setF("email", e.target.value)} />
            </div>
          </div>

          {/* Classification */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Classification & Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" value={form.colourCode} onChange={(e) => setF("colourCode", e.target.value as any)}>
                <option value="">Colour Code (default Other)</option>
                <option value="OUR">Our</option>
                <option value="OPPOSITE">Opposite</option>
                <option value="DOUBTFUL">Doubtful</option>
                <option value="OTHER">Other</option>
              </select>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]" checked={form.voted} onChange={(e) => setF("voted", e.target.checked)} />
                  <span className="text-sm text-gray-700">Voted</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]" checked={form.starVoter} onChange={(e) => setF("starVoter", e.target.checked)} />
                  <span className="text-sm text-gray-700">Star Voter</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]" checked={form.dead} onChange={(e) => setF("dead", e.target.checked)} />
                  <span className="text-sm text-gray-700">Deceased</span>
                </label>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Caste" value={form.caste} onChange={(e) => setF("caste", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Profession" value={form.profession} onChange={(e) => setF("profession", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Personnel" value={form.personnel} onChange={(e) => setF("personnel", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Society" value={form.society} onChange={(e) => setF("society", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Flat No." value={form.flatNo} onChange={(e) => setF("flatNo", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="New Address" value={form.newAddress} onChange={(e) => setF("newAddress", e.target.value)} />
              <input className="col-span-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Demands" value={form.demands} onChange={(e) => setF("demands", e.target.value)} />
            </div>
          </div>

          {/* Extra Fields */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Extra Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Extra Info 1" value={form.extraInfo1} onChange={(e) => setF("extraInfo1", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Extra Info 2" value={form.extraInfo2} onChange={(e) => setF("extraInfo2", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Extra Info 3" value={form.extraInfo3} onChange={(e) => setF("extraInfo3", e.target.value)} />
              <input className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Extra Info 4" value={form.extraInfo4} onChange={(e) => setF("extraInfo4", e.target.value)} />
              <input className="col-span-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none" placeholder="Extra Info 5" value={form.extraInfo5} onChange={(e) => setF("extraInfo5", e.target.value)} />
              <div className="col-span-full flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]" checked={form.extraCheck1} onChange={(e) => setF("extraCheck1", e.target.checked)} />
                  <span className="text-sm text-gray-700">Extra Check 1</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]" checked={form.extraCheck2} onChange={(e) => setF("extraCheck2", e.target.checked)} />
                  <span className="text-sm text-gray-700">Extra Check 2</span>
                </label>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button type="submit" disabled={adding || !form.name.trim()} className="px-6 py-3 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all">
              {adding ? "Adding..." : "Add Voter"}
            </button>
            <button type="button" onClick={() => setAddOpen(false)} className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            {addErr && <p className="text-red-600 text-sm">{addErr}</p>}
          </div>
        </form>
      </Modal>

      {/* ------------ Bulk Upload Modal ------------ */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Bulk Upload Voters">
        <form onSubmit={onImport} className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#EF3340]/50 transition-colors">
            <Upload className="mx-auto text-gray-400 mb-3" size={40} />
            <input
              name="file"
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#EF3340] file:text-white hover:file:bg-[#C82333] file:cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-2">CSV or XLSX files accepted</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">Accepted Headers:</p>
            <p className="text-xs text-blue-700">
              name, village, voterId, phone/mobile, mobile2, colourCode, voted, starVoter, dead, boothNo, partNo, srn, age, gender, address, email, etc.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={importing} className="px-6 py-3 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all">
              {importing ? "Uploading..." : "Upload File"}
            </button>
            <button type="button" onClick={() => setImportOpen(false)} className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>

          {importMsg && (
            <div className={`p-4 rounded-xl text-sm ${
              importMsg.includes("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {importMsg}
            </div>
          )}
        </form>
      </Modal>

      {/* ------------ Delete Confirmation Modal ------------ */}
      {deleteIntent && (
        <Modal
          open={!!deleteIntent}
          onClose={() => setDeleteIntent(null)}
          title="Delete Voter"
        >
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Are you sure?
              </h3>
              <p className="text-gray-600">
                Do you want to delete this voter? This action cannot be undone.
              </p>
            </div>

            {deleteErr && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
                {deleteErr}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteIntent(null)}
                disabled={deleting === deleteIntent}
                className="px-6 py-3 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                No, Cancel
              </button>
              <button
                onClick={() => doDelete(deleteIntent)}
                disabled={deleting === deleteIntent}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
              >
                {deleting === deleteIntent ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}