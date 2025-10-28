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
  Map as MapIcon,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { ColourCode, VoterListItem, Voter, ListRow } from "@/types/voter";
import { buildShareText } from "@/lib/share";
import DeleteConfirmModal from "./DeleteConfirmModal";
import Portal from "@/components/common/Portal";

// (kept in case you still use colour somewhere else)
function getColorBadge(code: ColourCode) {
  const styles: Record<ColourCode, string> = {
    OUR: "bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 text-emerald-700 border-emerald-500/25 shadow-sm shadow-emerald-500/10",
    OPPOSITE:
      "bg-gradient-to-br from-rose-500/15 to-rose-600/10 text-rose-700 border-rose-500/25 shadow-sm shadow-rose-500/10",
    DOUBTFUL:
      "bg-gradient-to-br from-amber-500/15 to-amber-600/10 text-amber-700 border-amber-500/25 shadow-sm shadow-amber-500/10",
    OTHER:
      "bg-gradient-to-br from-slate-500/10 to-slate-600/8 text-slate-700 border-slate-500/20 shadow-sm shadow-slate-500/5",
  };
  return styles[code] || styles.OTHER;
}

// Party chip style
function partyChip(s?: string | null) {
  const base =
    "inline-flex px-3 py-1.5 rounded-xl text-[11px] font-bold border tracking-wide";
  if (!s) return `${base} bg-slate-100 text-slate-600 border-slate-200/60`;
  return `${base} bg-indigo-50 text-indigo-700 border-indigo-200/60 shadow-sm shadow-indigo-500/10`;
}

function digitsOnly(s?: string | null) {
  return (s || "").replace(/\D/g, "");
}

// s/o / d/o rule for father name (mobile)
function fatherLine(gender: any, fatherName?: string | null): string | null {
  if (!fatherName) return null;
  const g = typeof gender === "string" ? gender.toUpperCase() : gender;
  if (g === "M") return `s/o ${fatherName}`;
  if (g === "F") return `d/o ${fatherName}`;
  return fatherName;
}

export default function VotersTable({
  items,
  loading,
  onDeleteAsk,
  isAdmin = false,
  onPatch,
  onRemoveMany,
}: {
  items: VoterListItem[];
  loading: boolean;
  onDeleteAsk: (id: string) => void;
  isAdmin?: boolean;
  onPatch?: (id: string | number, patch: Partial<VoterListItem>) => void;
  onRemoveMany?: (ids: string[]) => void;
}) {
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
        onPatch?.(id, { voted: nextVal });
      }
    } catch (e: any) {
      setVotedOverride((m) => ({ ...m, [key]: currentValue }));
      alert(e?.message || "Failed to update voted status");
    } finally {
      setSavingVote((s) => ({ ...s, [key]: false }));
    }
  }

  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [voterLoaded, setVoterLoaded] = useState<Voter | null>(null);
  const [familyLoaded, setFamilyLoaded] = useState<ListRow[]>([]);
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
      function handleKey(e: KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
      }
      function handleScroll() {
        setOpen(false);
      }
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
      if (open) {
        setOpen(false);
        return;
      }
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
          className="p-2.5 rounded-full hover:bg-slate-100/80 active:scale-95 transition-all duration-200"
          title="More"
          type="button"
        >
          <MoreVertical size={18} className="text-slate-600" strokeWidth={2.5} />
        </button>

        {open && (
          <Portal>
            <div className="fixed inset-0 z-[199] bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setOpen(false)} />
            <div
              ref={menuRef}
              className="fixed z-[200] bg-white/95 backdrop-blur-xl border border-slate-200/60 shadow-2xl focus:outline-none w-48 rounded-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200"
              style={{ top: `${pos?.top ?? 0}px`, left: `${pos?.left ?? 0}px` }}
            >
              <div className="py-1.5">
                <button
                  onClick={() => {
                    setOpen(false);
                    fetchVoterAndFamily(id);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-slate-100/60 active:bg-slate-100 flex items-center gap-3 transition-colors"
                  type="button"
                >
                  <Share2 size={16} strokeWidth={2.5} className="text-blue-600" />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    downloadPdfFor(id);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-slate-100/60 active:bg-slate-100 flex items-center gap-3 transition-colors"
                  type="button"
                >
                  <Download size={16} strokeWidth={2.5} className="text-indigo-600" />
                  <span>Download PDF</span>
                </button>
                <div className="h-px bg-slate-200/60 my-1.5" />
                <button
                  onClick={() => {
                    setOpen(false);
                    callNumber(primaryPhone);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-slate-100/60 active:bg-slate-100 flex items-center gap-3 transition-colors"
                  type="button"
                >
                  <PhoneIcon size={16} strokeWidth={2.5} className="text-emerald-600" />
                  <span>Call</span>
                </button>
                <button
                  onClick={() => {
                    setOpen(false);
                    whatsappNumber(primaryPhone);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-slate-100/60 active:bg-slate-100 flex items-center gap-3 transition-colors"
                  type="button"
                >
                  <MessageCircle size={16} strokeWidth={2.5} className="text-green-600" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </Portal>
        )}
      </>
    );
  }

  return (
    <div className="sm:bg-white sm:rounded-2xl sm:shadow-lg sm:border sm:border-slate-200/60 overflow-hidden">
      {loading ? (
        <div className="p-12 sm:p-16 text-center">
          <div className="inline-block w-12 h-12 sm:w-14 sm:h-14 border-[3px] border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="mt-5 text-slate-600 text-sm sm:text-base font-medium">Loading voters...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 sm:p-16 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <User className="text-slate-400" size={32} strokeWidth={2} />
          </div>
          <p className="text-slate-900 font-semibold text-base sm:text-lg">No voters found</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {isAdmin && (
            <>
              {!selectionMode ? (
                <div className="hidden sm:flex items-center justify-end px-5 py-3 border-b bg-slate-50/40 backdrop-blur-sm">
                  <button
                    onClick={() => {
                      setSelectionMode(true);
                      setSelected(new Set());
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300/60 text-sm font-semibold hover:bg-white hover:shadow-sm active:scale-[0.98] transition-all duration-200"
                    type="button"
                  >
                    Delete multiple
                  </button>
                </div>
              ) : (
                <div className="sticky top-0 z-[5] flex items-center justify-between px-4 sm:px-5 py-3 border-b bg-amber-50/95 backdrop-blur-xl border-amber-200/60 shadow-sm">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2.5 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded-lg border-2 border-amber-300 checked:bg-amber-500 checked:border-amber-500 transition-all"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                      <span className="text-amber-900">Select all</span>
                    </label>
                    <span className="text-sm font-semibold text-amber-900 hidden sm:inline px-2.5 py-1 rounded-full bg-amber-100/60">
                      {selected.size}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelected(new Set())}
                      className="px-3 sm:px-4 py-2 rounded-xl border border-amber-300/60 text-sm font-semibold hover:bg-white active:scale-[0.98] transition-all duration-200"
                      type="button"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setBulkOpen(true)}
                      className="px-3 sm:px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm shadow-rose-500/25"
                      type="button"
                      disabled={selected.size === 0}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        setSelectionMode(false);
                        setSelected(new Set());
                      }}
                      className="px-3 sm:px-4 py-2 rounded-xl border border-amber-300/60 text-sm font-semibold hover:bg-white active:scale-[0.98] transition-all duration-200"
                      type="button"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* MOBILE */}
          <div className="sm:hidden bg-slate-50/40">
            <ul className="divide-y divide-slate-200/60">
              {items.map((it, idx) => {
                const votedNow = effectiveVoted(it);
                const saving = !!savingVote[String(it.id)];
                const father = fatherLine((it as any).gender, it.fatherName);
                const party = (it as any).partySupport as string | null | undefined;
                return (
                  <li
                    key={it.id}
                    className="bg-white active:bg-slate-50 transition-colors"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        {isAdmin && selectionMode && (
                          <input
                            type="checkbox"
                            className="mt-1 w-5 h-5 rounded-lg border-2 border-slate-300 checked:bg-blue-500 checked:border-blue-500 transition-all flex-shrink-0"
                            checked={selected.has(String(it.id))}
                            onChange={(e) => toggleOne(String(it.id), e.target.checked)}
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-[15px] text-slate-900 leading-tight mb-1">
                                {it.name}
                              </div>

                              {/* Father BEFORE ID */}
                              {father && (
                                <div className="text-[12px] text-slate-600 font-medium">
                                  {father}
                                </div>
                              )}

                              {it.voterId && (
                                <div className="text-[12px] text-slate-500 font-medium">
                                  ID: {it.voterId}
                                </div>
                              )}
                            </div>

                            {/* PARTY chip on mobile: only if exists */}
                            {party ? (
                              <span className={`shrink-0 ${partyChip(party)}`}>
                                {party}
                              </span>
                            ) : null}
                          </div>

                          {typeof it.wardNo === "number" && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                              <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 font-medium">
                                <MapIcon size={13} strokeWidth={2.5} className="text-slate-400" />
                                Ward {it.wardNo}
                              </span>
                            </div>
                          )}

                          {(it.village || it.boothNo || it.partNo || it.mobile1) && (
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-slate-500 mb-2.5">
                              {it.village && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={12} strokeWidth={2.5} className="text-slate-400" />
                                  {it.village}
                                </span>
                              )}
                              {(it.boothNo || it.partNo) && (
                                <span className="text-slate-400 font-medium">
                                  {it.boothNo && `B${it.boothNo}`}
                                  {it.boothNo && it.partNo && " • "}
                                  {it.partNo && `P${it.partNo}`}
                                </span>
                              )}
                              {it.mobile1 && (
                                <span className="inline-flex items-center gap-1">
                                  <PhoneIcon size={11} strokeWidth={2.5} className="text-slate-400" />
                                  {it.mobile1}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mb-3">
                            {isAdmin ? (
                              <button
                                disabled={saving}
                                onClick={() => flipVoted(it.id, votedNow)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-200 ${
                                  votedNow
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/10"
                                    : "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/10"
                                } ${saving ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                                title={votedNow ? "Mark Not Voted" : "Mark Voted"}
                                type="button"
                              >
                                {votedNow ? <CheckCircle size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}
                                {votedNow ? "Voted" : "Not Voted"}
                              </button>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
                                  votedNow
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/10"
                                    : "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/10"
                                }`}
                              >
                                {votedNow ? <CheckCircle size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}
                                {votedNow ? "Voted" : "Not Voted"}
                              </span>
                            )}

                            <span
                              className={`inline-flex px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
                                it.dead
                                  ? "bg-slate-100 text-slate-700 border-slate-200/60"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/10"
                              }`}
                            >
                              {it.dead ? "Deceased" : "Alive"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <Link
                              href={`/voters/${it.id}`}
                              className="inline-flex items-center gap-2 text-[13px] font-semibold text-blue-600 active:text-blue-700 transition-colors"
                            >
                              <span>View Details</span>
                              <ChevronRight size={14} strokeWidth={3} />
                            </Link>

                            <div className="flex items-center gap-1">
                              {isAdmin && !selectionMode && (
                                <button
                                  onClick={() => onDeleteAsk(String(it.id))}
                                  className="p-2.5 rounded-full hover:bg-rose-50 active:scale-95 transition-all duration-200"
                                  title="Delete"
                                  type="button"
                                >
                                  <Trash2 size={18} className="text-rose-600" strokeWidth={2.5} />
                                </button>
                              )}
                              <Kebab id={it.id} primaryPhone={it.mobile1 || null} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* DESKTOP */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full">
              <thead className="bg-slate-50/60 backdrop-blur-sm border-b border-slate-200/60">
                <tr>
                  {isAdmin && selectionMode && (
                    <th className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded-lg border-2 border-slate-300 checked:bg-blue-500 checked:border-blue-500 transition-all"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Voter Info
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Father
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Ward
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Location
                  </th>

                  {/* CHANGED: Side → Party */}
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Party
                  </th>

                  <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Voted
                  </th>
                  <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {items.map((it, idx) => {
                  const votedNow = effectiveVoted(it);
                  const saving = !!savingVote[String(it.id)];
                  const party = (it as any).partySupport as string | null | undefined;
                  return (
                    <tr
                      key={it.id}
                      className="hover:bg-slate-50/60 transition-colors duration-150"
                      style={{ animationDelay: `${idx * 20}ms` }}
                    >
                      {isAdmin && selectionMode && (
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded-lg border-2 border-slate-300 checked:bg-blue-500 checked:border-blue-500 transition-all"
                            checked={selected.has(String(it.id))}
                            onChange={(e) => toggleOne(String(it.id), e.target.checked)}
                          />
                        </td>
                      )}

                      {/* Voter Info */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[15px] text-slate-900">{it.name}</div>
                        {it.voterId && (
                          <div className="text-[12px] text-slate-500 mt-1 font-medium">ID: {it.voterId}</div>
                        )}
                      </td>

                      {/* Father */}
                      <td className="px-5 py-4">
                        <div className="text-[14px] text-slate-700 font-medium">{it.fatherName || "—"}</div>
                      </td>

                      {/* Ward */}
                      <td className="px-5 py-4">
                        <div className="text-[14px] text-slate-700 font-medium">
                          {typeof it.wardNo === "number" ? `Ward ${it.wardNo}` : "—"}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-5 py-4">
                        {it.mobile1 ? (
                          <div className="text-[14px] text-slate-700 font-medium">{it.mobile1}</div>
                        ) : (
                          <span className="text-[14px] text-slate-400">No contact</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-5 py-4">
                        <div className="text-[14px] text-slate-700 font-medium">{it.village || "—"}</div>
                        {(it.boothNo || it.partNo) && (
                          <div className="text-[12px] text-slate-500 mt-1">
                            {it.boothNo && `Booth ${it.boothNo}`}
                            {it.boothNo && it.partNo && " • "}
                            {it.partNo && `Part ${it.partNo}`}
                          </div>
                        )}
                      </td>

                      {/* Party */}
                      <td className="px-5 py-4">
                        <span className={partyChip(party)}>{party || "—"}</span>
                      </td>

                      {/* Voted */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center">
                          {isAdmin ? (
                            <button
                              disabled={saving}
                              onClick={() => flipVoted(it.id, votedNow)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all duration-200 ${
                                votedNow
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/10"
                                  : "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/10"
                              } ${saving ? "opacity-60 cursor-not-allowed" : "hover:shadow-md active:scale-95"}`}
                              title={votedNow ? "Mark Not Voted" : "Mark Voted"}
                              type="button"
                            >
                              {votedNow ? <CheckCircle size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
                              {votedNow ? "Voted" : "Not Voted"}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold border ${
                                votedNow
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-sm shadow-emerald-500/10"
                                  : "bg-rose-50 text-rose-700 border-rose-200/60 shadow-sm shadow-rose-500/10"
                              }`}
                            >
                              {votedNow ? <CheckCircle size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
                              {votedNow ? "Voted" : "Not Voted"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center">
                          {it.dead ? (
                            <span className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                              Deceased
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm shadow-emerald-500/10">
                              Alive
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/voters/${it.id}`}
                            className="p-2.5 rounded-full hover:bg-slate-100/80 active:scale-95 transition-all duration-200"
                            title="View"
                          >
                            <Eye size={18} className="text-slate-600" strokeWidth={2.5} />
                          </Link>
                          {isAdmin && !selectionMode && (
                            <button
                              onClick={() => onDeleteAsk(String(it.id))}
                              className="p-2.5 rounded-full hover:bg-rose-50 active:scale-95 transition-all duration-200"
                              title="Delete"
                              type="button"
                            >
                              <Trash2 size={18} className="text-rose-600" strokeWidth={2.5} />
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
        <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
          <button
            aria-label="Close"
            onClick={() => setShareOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
            <div className="mx-0 sm:mx-4 rounded-t-[28px] sm:rounded-[28px] bg-white/95 backdrop-blur-xl shadow-2xl border border-slate-200/60 overflow-hidden pb-[max(20px,env(safe-area-inset-bottom))]">
              <div className="sm:hidden h-6 flex items-center justify-center pt-2">
                <div className="h-1.5 w-14 rounded-full bg-slate-300/60" />
              </div>

              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60">
                <div className="font-bold text-[17px] text-slate-900">Share Voter</div>
                <button
                  onClick={() => setShareOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100/80 active:scale-95 transition-all duration-200"
                  title="Close"
                  type="button"
                >
                  <X size={20} strokeWidth={2.5} className="text-slate-600" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {busy && (
                  <div className="text-center py-8">
                    <div className="inline-block w-10 h-10 border-[3px] border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                    <p className="mt-3 text-sm text-slate-600 font-medium">Loading…</p>
                  </div>
                )}
                {errMsg && (
                  <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200/60 text-sm text-rose-700 font-medium">
                    {errMsg}
                  </div>
                )}

                {voterLoaded && (
                  <div className="rounded-2xl border border-slate-200/60 bg-slate-50/40 overflow-hidden shadow-sm">
                    <div className="px-4 py-3.5 border-b border-slate-200/60 bg-white/60 backdrop-blur-sm flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <IdCard size={16} strokeWidth={2.5} className="text-blue-600" />
                      </div>
                      <span className="font-semibold text-[15px] text-slate-900 flex-1">
                        {voterLoaded.name}
                      </span>
                      {voterLoaded.voterId && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/60 text-slate-700">
                          {voterLoaded.voterId}
                        </span>
                      )}
                    </div>

                    {voterLoaded.village && (
                      <div className="px-4 py-2.5 text-[13px] text-slate-600 flex items-center gap-2 bg-white/40">
                        <MapPin size={14} strokeWidth={2.5} className="text-slate-400" />
                        <span className="font-medium">{voterLoaded.village}</span>
                      </div>
                    )}

                    <div className="p-4 space-y-3 bg-white/60">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={shareWhatsAppThread}
                          className="flex flex-col items-center justify-center gap-2.5 px-4 py-5 rounded-2xl border border-slate-200/60 hover:bg-white hover:shadow-md active:scale-[0.98] transition-all duration-200 bg-gradient-to-br from-white to-slate-50/40"
                          type="button"
                        >
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <MessageCircle size={20} strokeWidth={2.5} className="text-green-600" />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-900">WhatsApp</span>
                        </button>
                        <button
                          onClick={shareSMS}
                          className="flex flex-col items-center justify-center gap-2.5 px-4 py-5 rounded-2xl border border-slate-200/60 hover:bg-white hover:shadow-md active:scale-[0.98] transition-all duration-200 bg-gradient-to-br from-white to-slate-50/40"
                          type="button"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <MessageCircle size={20} strokeWidth={2.5} className="text-blue-600" />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-900">SMS</span>
                        </button>
                      </div>

                      <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden shadow-sm">
                        <div className="px-3 py-2 bg-slate-50/60 border-b border-slate-200/60">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                            Preview
                          </span>
                        </div>
                        <textarea
                          readOnly
                          value={buildShareText(voterLoaded, familyLoaded)}
                          className="w-full h-40 text-[13px] leading-relaxed p-3 bg-white outline-none resize-none text-slate-700 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!busy && !voterLoaded && !errMsg && (
                  <div className="text-center py-8 text-sm text-slate-600 font-medium">
                    Preparing share…
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE MODAL */}
      {isAdmin && (
        <DeleteConfirmModal
          open={bulkOpen}
          onClose={() => setBulkOpen(false)}
          onDeleted={async () => {
            const ids = Array.from(selected);
            onRemoveMany?.(ids);
            setSelected(new Set());
            setSelectionMode(false);
          }}
          ids={Array.from(selected)}
        />
      )}
    </div>
  );
}
