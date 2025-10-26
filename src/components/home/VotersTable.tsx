"use client";

import Link from "next/link";
import {
  CheckCircle,
  Download,
  Eye,
  MoreVertical,
  Phone as PhoneIcon,
  MessageCircle,
  Share2,
  Trash2,
  User,
  X,
  MapPin,
  IdCard,
  UsersRound,
  Map as MapIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ColourCode, VoterListItem, Voter, ListRow } from "@/types/voter";
import { buildShareText } from "@/lib/share";
import DeleteConfirmModal from "./DeleteConfirmModal";
import Portal from "@/components/common/Portal";
import { useCallback } from "react";

function getColorBadge(code: ColourCode) {
  const styles: Record<ColourCode, string> = {
    OUR: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    OPPOSITE: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    DOUBTFUL: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    OTHER: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  };
  return styles[code] || styles.OTHER;
}
function digitsOnly(s?: string | null) {
  return (s || "").replace(/\D/g, "");
}

export default function VotersTable({
  items,
  loading,
  onDeleteAsk,
  isAdmin = false,
}: {
  items: VoterListItem[];
  loading: boolean;
  onDeleteAsk: (id: string) => void;
  isAdmin?: boolean;
}) {
  // ===== selection mode (admin-only) =====
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = useMemo(
    () => items.length > 0 && items.every((it) => selected.has(String(it.id))),
    [items, selected]
  );

  function toggleOne(id: string, checked: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function toggleAll(checked: boolean) {
    setSelected(() => {
      if (!checked) return new Set();
      return new Set(items.map((it) => String(it.id)));
    });
  }

  // ===== optimistic voted overrides + saving flags (admin only) =====
  const [votedOverride, setVotedOverride] = useState<Record<string, boolean | undefined>>({});
  const [savingVote, setSavingVote] = useState<Record<string, boolean>>({});

  function effectiveVoted(it: VoterListItem) {
    const ov = votedOverride[String(it.id)];
    return typeof ov === "boolean" ? ov : it.voted;
  }

  async function flipVoted(id: string | number, currentValue: boolean) {
    if (!isAdmin) return;
    const key = String(id);
    const nextVal = !currentValue;
    setSavingVote((s) => ({ ...s, [key]: true }));
    setVotedOverride((m) => ({ ...m, [key]: nextVal }));

    try {
      const res = await fetch(`/api/voters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voted: nextVal }),
      });
      if (!res.ok) {
        setVotedOverride((m) => ({ ...m, [key]: currentValue }));
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "Failed to update voted status");
      } else {
        window.dispatchEvent(new CustomEvent("voters:refresh"));
      }
    } catch (e: any) {
      setVotedOverride((m) => ({ ...m, [key]: currentValue }));
      alert(e?.message || "Failed to update voted status");
    } finally {
      setSavingVote((s) => ({ ...s, [key]: false }));
    }
  }

  // ===== Share modal state =====
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [voterLoaded, setVoterLoaded] = useState<Voter | null>(null);
  const [familyLoaded, setFamilyLoaded] = useState<ListRow[]>([]);

  // ===== Bulk delete modal =====
  const [bulkOpen, setBulkOpen] = useState(false);

  async function fetchVoterAndFamily(voterId: string | number) {
    setBusy(true);
    setErrMsg(null);
    setVoterLoaded(null);
    setFamilyLoaded([]);
    try {
      const vRes = await fetch(`/api/voters/${voterId}`, { cache: "no-store" });
      const vJson = await vRes.json().catch(() => ({}));
      if (!vRes.ok) throw new Error(vJson.error || "Voter not found");

      const v: Voter = {
        ...vJson,
        dob: vJson.dob ? String(vJson.dob).slice(0, 10) : null,
      };

      let fam: ListRow[] = [];
      if (v.familyId) {
        const usp = new URLSearchParams();
        usp.set("q", v.familyId);
        usp.set("limit", "200");
        const fRes = await fetch(`/api/voters?${usp.toString()}`, { cache: "no-store" });
        const fJson = await fRes.json().catch(() => ({}));
        if (fRes.ok && Array.isArray(fJson.items)) {
          fam = fJson.items
            .filter((m: any) => String(m.id) !== String(v.id))
            .map((m: any) => ({
              id: String(m.id),
              name: String(m.name ?? ""),
              voterId: m.voterId ?? null,
              village: m.village ?? null,
              mobile1: m.mobile1 ?? null,
              colourCode: m.colourCode ?? "OTHER",
              fatherName: m.fatherName ?? null,
              wardNo: m.wardNo ?? null,
            }));
        }
      }

      setVoterLoaded(v);
      setFamilyLoaded(fam);
      setShareOpen(true);
    } catch (e: any) {
      setErrMsg(e?.message || "Failed to load data");
    } finally {
      setBusy(false);
    }
  }

  function downloadPdfFor(voterId: string | number) {
    (async () => {
      try {
        const r = await fetch(`/api/voters/${voterId}/export.pdf`, { cache: "no-store" });
        if (!r.ok) throw new Error("Download failed");
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `voter-${voterId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch {
        alert("Could not download PDF.");
      }
    })();
  }

  function callNumber(raw?: string | null) {
    const num = digitsOnly(raw);
    if (!num) return alert("No phone number");
    window.location.href = `tel:${num}`;
  }
  function whatsappNumber(raw?: string | null) {
    const num = digitsOnly(raw);
    if (!num) return alert("No phone number");
    window.open(`https://wa.me/${num}`, "_blank");
  }

  function shareWhatsAppThread() {
    if (!voterLoaded) return;
    const txt = buildShareText(voterLoaded, familyLoaded);
    const encoded = encodeURIComponent(txt);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }
  function shareSMS() {
    if (!voterLoaded) return;
    const txt = buildShareText(voterLoaded, familyLoaded);
    const encoded = encodeURIComponent(txt);
    window.location.href = `sms:?&body=${encoded}`;
  }

  function Kebab({
    id,
    primaryPhone,
  }: {
    id: string | number;
    primaryPhone?: string | null;
  }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const anchorRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const update = () => setIsMobile(window.innerWidth < 640);
      update();
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }, []);

    useEffect(() => {
      if (!open) return;
      function handleClick(e: MouseEvent) {
        const t = e.target as Node | null;
        if (!t) return;
        const insideAnchor = !!anchorRef.current && anchorRef.current.contains(t);
        const insideMenu = !!menuRef.current && menuRef.current.contains(t);
        if (!insideAnchor && !insideMenu) setOpen(false);
      }
      function handleKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
      function handleScroll() { setOpen(false); }
      document.addEventListener("click", handleClick, true);
      document.addEventListener("keydown", handleKey, true);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleScroll);
      return () => {
        document.removeEventListener("click", handleClick, true);
        document.removeEventListener("keydown", handleKey, true);
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleScroll);
      };
    }, [open]);

    const calculatePosition = useCallback(() => {
      if (!anchorRef.current) return null;
      const buttonRect = anchorRef.current.getBoundingClientRect();
      const desktopMenuWidth = 192;
      const mobileMenuWidth = 160;
      const menuHeight = 200;
      const gap = 8;
      const padding = 8;
      const vp = { w: window.innerWidth, h: window.innerHeight };
      let left: number;
      let top: number;

      if (isMobile) {
        left = buttonRect.right + gap;
        if (left + mobileMenuWidth + padding > vp.w) left = buttonRect.left - mobileMenuWidth - gap;
        if (left < padding) left = padding;
        if (left + mobileMenuWidth > vp.w - padding) left = vp.w - mobileMenuWidth - padding;
        top = buttonRect.bottom + gap;
        if (top + menuHeight + padding > vp.h) top = Math.max(padding, buttonRect.top - menuHeight - gap);
      } else {
        left = buttonRect.right + gap;
        top = buttonRect.top;
        if (left + desktopMenuWidth + padding > vp.w) left = buttonRect.left - desktopMenuWidth - gap;
        if (left < padding) left = padding;
        if (left + desktopMenuWidth > vp.w - padding) left = vp.w - desktopMenuWidth - padding;
        if (top + menuHeight + padding > vp.h) top = buttonRect.top - menuHeight - gap;
        if (top < padding) top = padding;
      }
      return { top, left };
    }, [isMobile]);


    function toggle() {
      if (open) { setOpen(false); return; }
      const newPos = calculatePosition();
      setPos(newPos);
      setOpen(true);
    }

    useEffect(() => {
      if (!open || isMobile) return;
      const handlePositionUpdate = () => setPos(calculatePosition());
      window.addEventListener("scroll", handlePositionUpdate, true);
      window.addEventListener("resize", handlePositionUpdate);
      return () => {
        window.removeEventListener("scroll", handlePositionUpdate, true);
        window.removeEventListener("resize", handlePositionUpdate);
      };
    }, [open, isMobile, calculatePosition]);


    return (
      <>
        <button
          ref={anchorRef}
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          title="More"
          type="button"
        >
          <MoreVertical size={16} className="text-slate-700" />
        </button>

        {open && (
          <Portal>
            <div className="fixed inset-0 z-[199] bg-black/20" onClick={() => setOpen(false)} />
            <div
              ref={menuRef}
              className="fixed z-[200] bg-white border border-slate-200 shadow-xl focus:outline-none w-48 rounded-xl overflow-y-auto max-h-[calc(100vh-16px)]"
              style={{ top: `${pos?.top ?? 0}px`, left: `${pos?.left ?? 0}px` }}
            >
              <button
                onClick={() => { setOpen(false); fetchVoterAndFamily(id); }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                type="button"
              >
                <Share2 size={14} /> Share (WA/SMS)
              </button>
              <button
                onClick={() => { setOpen(false); downloadPdfFor(id); }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                type="button"
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={() => { setOpen(false); callNumber(primaryPhone); }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                type="button"
              >
                <PhoneIcon size={14} /> Call
              </button>
              <button
                onClick={() => { setOpen(false); whatsappNumber(primaryPhone); }}
                className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                type="button"
              >
                <MessageCircle size={14} /> WhatsApp
              </button>
            </div>
          </Portal>
        )}
      </>
    );
  }

  // ---------- UI ----------
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {loading ? (
        <div className="p-10 sm:p-12 text-center">
          <div className="inline-block w-10 h-10 sm:w-12 sm:h-12 border-4 border-slate-200 border-t-[#EF3340] rounded-full animate-spin" />
          <p className="mt-3 sm:mt-4 text-slate-600 text-sm sm:text-base">Loading voters...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 sm:p-12 text-center">
          <User className="mx-auto text-slate-300" size={40} />
          <p className="mt-3 sm:mt-4 text-slate-700 font-semibold text-sm sm:text-base">No voters found</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* ===== Admin: selection controls header ===== */}
          {isAdmin && (
            <>
              {!selectionMode ? (
                <div className="flex items-center justify-end px-3 sm:px-4 py-2 border-b bg-slate-50/60">
                  <button
                    onClick={() => { setSelectionMode(true); setSelected(new Set()); }}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-100"
                    type="button"
                  >
                    Delete multiple
                  </button>
                </div>
              ) : (
                <div className="sticky top-0 z-[5] flex items-center justify-between px-3 sm:px-4 py-2 border-b bg-amber-50 border-amber-200">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-amber-300"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                      <span className="font-medium text-amber-900">Select all</span>
                    </label>
                    <span className="text-sm font-medium text-amber-900 hidden sm:inline">
                      {selected.size} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelected(new Set())}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 text-sm hover:bg-amber-100"
                      type="button"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setBulkOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700 disabled:opacity-50"
                      type="button"
                      disabled={selected.size === 0}
                    >
                      Delete Selected
                    </button>
                    <button
                      onClick={() => { setSelectionMode(false); setSelected(new Set()); }}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 text-sm hover:bg-amber-100"
                      type="button"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== MOBILE cards ===== */}
          <ul className="p-3 space-y-3 sm:hidden">
            {items.map((it) => {
              const votedNow = effectiveVoted(it);
              const saving = !!savingVote[String(it.id)];
              return (
                <li key={it.id} className="rounded-xl border border-slate-200 p-3 bg-white shadow-sm">
                  <div className="flex items-start gap-3">
                    {isAdmin && selectionMode && (
                      <input
                        type="checkbox"
                        className="mt-1.5 w-4 h-4 rounded border-slate-300"
                        checked={selected.has(String(it.id))}
                        onChange={(e) => toggleOne(String(it.id), e.target.checked)}
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-slate-900 truncate">{it.name}</div>
                        <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getColorBadge(it.colourCode)}`}>
                          {it.colourCode}
                        </span>
                      </div>

                      {it.voterId && <div className="text-[11px] text-slate-500 mt-0.5">ID: {it.voterId}</div>}

                      {/* NEW: father + ward row */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                        {it.fatherName && (
                          <span className="inline-flex items-center gap-1">
                            <UsersRound size={12} /> {it.fatherName}
                          </span>
                        )}
                        {typeof it.wardNo === "number" && (
                          <span className="inline-flex items-center gap-1">
                            <MapIcon size={12} /> Ward {it.wardNo}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                        {it.village && <span>{it.village}</span>}
                        {(it.boothNo || it.partNo) && (
                          <span className="text-slate-500">
                            {it.boothNo && `Booth ${it.boothNo}`}
                            {it.boothNo && it.partNo && " • "}
                            {it.partNo && `Part ${it.partNo}`}
                          </span>
                        )}
                        {it.mobile1 && <span>📞 {it.mobile1}</span>}
                      </div>

                      {/* voted/status row */}
                      <div className="mt-1 flex items-center gap-2">
                        {isAdmin ? (
                          <button
                            disabled={saving}
                            onClick={() => flipVoted(it.id, votedNow)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${votedNow
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                              } ${saving ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                            title={votedNow ? "Mark Not Voted" : "Mark Voted"}
                            type="button"
                          >
                            {votedNow ? <CheckCircle size={12} /> : <X size={12} />}
                            {votedNow ? "Voted" : "Not Voetd"}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${votedNow
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                              }`}
                            title={votedNow ? "Voted" : "Not Voted"}
                          >
                            {votedNow ? <CheckCircle size={12} /> : <X size={12} />}
                            {votedNow ? "Voted" : "Not Voted"}
                          </span>
                        )}

                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${it.dead ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                        >
                          {it.dead ? "Deceased" : "Alive"}
                        </span>
                      </div>

                      {/* compact toolbar */}
                      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
                        <Link
                          href={`/voters/${it.id}`}
                          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100 active:scale-95 transition"
                          title="View"
                        >
                          <Eye size={18} className="text-slate-700" />
                        </Link>

                        {isAdmin && !selectionMode && (
                          <button
                            onClick={() => onDeleteAsk(String(it.id))}
                            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-rose-50 active:scale-95 transition"
                            title="Delete"
                            type="button"
                          >
                            <Trash2 size={18} className="text-rose-600" />
                          </button>
                        )}

                        <Kebab id={it.id} primaryPhone={it.mobile1 || null} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* ===== DESKTOP/TABLET table ===== */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {isAdmin && selectionMode && (
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Voter Info</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Father</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Ward</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Voter's Side</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Voted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((it) => {
                  const votedNow = effectiveVoted(it);
                  const saving = !!savingVote[String(it.id)];
                  return (
                    <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                      {isAdmin && selectionMode && (
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-slate-300"
                            checked={selected.has(String(it.id))}
                            onChange={(e) => toggleOne(String(it.id), e.target.checked)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{it.name}</div>
                        {it.voterId && <div className="text-xs text-slate-500 mt-1">ID: {it.voterId}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">{it.fatherName || "—"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">{typeof it.wardNo === "number" ? `Ward ${it.wardNo}` : "—"}</div>
                      </td>
                      <td className="px-4 py-4">
                        {it.mobile1 ? <div className="text-sm text-slate-700">{it.mobile1}</div> : <span className="text-sm text-slate-400">No contact</span>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">{it.village || "-"}</div>
                        {(it.boothNo || it.partNo) && (
                          <div className="text-xs text-slate-500 mt-1">
                            {it.boothNo && `Booth ${it.boothNo}`}
                            {it.boothNo && it.partNo && " • "}
                            {it.partNo && `Part ${it.partNo}`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${getColorBadge(it.colourCode)}`}>{it.colourCode}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          {isAdmin ? (
                            <button
                              disabled={saving}
                              onClick={() => flipVoted(it.id, votedNow)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${votedNow
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-rose-100 text-rose-700 border-rose-200"
                                } ${saving ? "opacity-60 cursor-not-allowed" : "hover:shadow active:scale-95"}`}
                              title={votedNow ? "Mark Not Voted" : "Mark Voted"}
                              type="button"
                            >
                              {votedNow ? <CheckCircle size={16} /> : <X size={16} />}
                              {votedNow ? "Voted" : "Not Voted"}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${votedNow
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : "bg-rose-100 text-rose-700 border-rose-200"
                                }`}
                              title={votedNow ? "Voted" : "Not Voted"}
                            >
                              {votedNow ? <CheckCircle size={16} /> : <X size={16} />}
                              {votedNow ? "Voted" : "Not Voted"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          {it.dead ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Deceased</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">Alive</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/voters/${it.id}`} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" title="View">
                            <Eye size={16} className="text-slate-600" />
                          </Link>
                          {isAdmin && !selectionMode && (
                            <button
                              onClick={() => onDeleteAsk(String(it.id))}
                              className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Delete"
                              type="button"
                            >
                              <Trash2 size={16} className="text-rose-600" />
                            </button>
                          )}
                          <Kebab id={it.id} primaryPhone={it.mobile1 || null} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* SHARE MODAL */}
      {shareOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            aria-label="Close"
            onClick={() => setShareOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg">
            <div className="mx-0 sm:mx-0 rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden pb-[max(16px,env(safe-area-inset-bottom))]">
              <div className="sm:hidden h-6 flex items-center justify-center">
                <div className="h-1.5 w-12 rounded-full bg-slate-200" />
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-semibold text-slate-800">Share voter</div>
                <button onClick={() => setShareOpen(false)} className="p-2 rounded-md hover:bg-slate-100" title="Close" type="button">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {busy && <div className="text-sm text-slate-600">Loading…</div>}
                {errMsg && <div className="text-sm text-rose-600">{errMsg}</div>}

                {voterLoaded && (
                  <div className="rounded-xl border bg-slate-50 overflow-hidden">
                    <div className="px-3 py-2 border-b bg-white flex items-center gap-2 text-slate-700">
                      <IdCard size={16} />
                      <span className="font-semibold">{voterLoaded.name}</span>
                      {voterLoaded.voterId && (
                        <span className="ml-auto text-xs px-2 py-0.5 rounded bg-slate-100 border">
                          {voterLoaded.voterId}
                        </span>
                      )}
                    </div>

                    <div className="px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
                      {voterLoaded.village && (
                        <>
                          <MapPin size={14} />
                          <span>{voterLoaded.village}</span>
                        </>
                      )}
                    </div>

                    <div className="p-3 space-y-2 bg-white">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={shareWhatsAppThread}
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border hover:bg-slate-50 active:scale-[0.99] transition text-center"
                          type="button"
                        >
                          <MessageCircle size={20} />
                          <span className="text-xs font-medium">WhatsApp</span>
                        </button>
                        <button
                          onClick={shareSMS}
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border hover:bg-slate-50 active:scale-[0.99] transition text-center"
                          type="button"
                        >
                          <MessageCircle size={20} />
                          <span className="text-xs font-medium">SMS</span>
                        </button>
                      </div>

                      <div className="rounded-lg border bg-slate-50">
                        <textarea
                          readOnly
                          value={buildShareText(voterLoaded, familyLoaded)}
                          className="w-full h-40 text-xs leading-5 p-2 bg-transparent outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!busy && !voterLoaded && !errMsg && (
                  <div className="text-sm text-slate-600">Preparing share…</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE MODAL (admin only) */}
      {isAdmin && (
        <DeleteConfirmModal
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          onDeleted={async () => {
            setSelected(new Set());
            setSelectionMode(false);
          }}
          ids={Array.from(selected)}
        />
      )}
    </div>
  );
}
