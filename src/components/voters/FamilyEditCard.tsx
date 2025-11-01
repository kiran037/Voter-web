"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, ExternalLink, Users } from "lucide-react";
import type { FamilyIdType, FamilyRole, Voter } from "@/types/voter";

const cardCls =
  "bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-slate-200/60 overflow-hidden";
const headerCls =
  "px-3 sm:px-6 py-2 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white border-b border-slate-200/60";
const titleCls = "text-sm sm:text-lg font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2";

const inputBase =
  "w-full px-2 py-1.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border transition-all outline-none disabled:bg-slate-50 disabled:text-slate-500 text-xs sm:text-base";
const inputRing = "border-slate-300 focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20";
const inputCls = `${inputBase} ${inputRing}`;
const labelCls = "block text-xs sm:text-sm font-semibold text-slate-700 mb-1 sm:mb-2";

export default function FamilyEditCard({
  voter,
  edit,
  setField,
  onMakeHead,
}: {
  voter: Voter;
  edit: boolean;
  setField: <K extends keyof Voter>(k: K, v: Voter[K]) => void;
  onMakeHead: () => void;
}) {
  const headObj = voter.head as unknown as Record<string, unknown> | undefined;
  const headEpicFromObj =
    headObj && typeof headObj === "object" && "voterId" in headObj
      ? (headObj as { voterId?: string | null }).voterId || undefined
      : undefined;

  const [fetchedEpic, setFetchedEpic] = useState<string | null>(null);
  const [fetchedHeadInternalId, setFetchedHeadInternalId] = useState<string | number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchHeadEpicByInternalId(idLike: string | number) {
      try {
        const res = await fetch(`/api/voters/${idLike}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({} as any));
        if (!cancelled && res.ok) {
          setFetchedEpic(j?.voterId ?? null);
          setFetchedHeadInternalId(j?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setFetchedEpic(null);
          setFetchedHeadInternalId(null);
        }
      }
    }

    const rawHeadId = voter.headId as unknown as string | number | null | undefined;
    const headIdStr = rawHeadId != null ? String(rawHeadId) : "";
    const looksNumericInternal = /^\d+$/.test(headIdStr);

    if (!headEpicFromObj && looksNumericInternal && headIdStr) {
      fetchHeadEpicByInternalId(headIdStr);
    } else {
      setFetchedEpic(null);
      setFetchedHeadInternalId(null);
    }

    return () => {
      cancelled = true;
    };
  }, [voter.headId, headEpicFromObj]);

  const headInputValue =
    (headEpicFromObj && String(headEpicFromObj)) ||
    (fetchedEpic && String(fetchedEpic)) ||
    (voter.headId != null ? String(voter.headId) : "");

  const headDisplay =
    (headEpicFromObj && String(headEpicFromObj)) ||
    (fetchedEpic && String(fetchedEpic)) ||
    voter.head?.name ||
    (voter.headId ? String(voter.headId) : null);

  const headLinkTarget =
    (voter.head as unknown as { id?: string | number } | undefined)?.id ??
    fetchedHeadInternalId ??
    voter.headId;

  return (
    <div className={cardCls}>
      <div className={headerCls}>
        <h3 className={titleCls}>
          <span className="inline-flex w-5 h-5 sm:w-8 sm:h-8 items-center justify-center rounded-full bg-[#EF3340]/10">
            <Users size={14} className="sm:hidden text-[#EF3340]" />
            <Users size={18} className="hidden sm:block text-[#EF3340]" />
          </span>
          <span className="text-xs sm:text-lg">Family (Head-based)</span>
        </h3>
      </div>

      <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-6">
          <div className="col-span-2 sm:lg:col-span-2">
            <label className={labelCls}>Family ID</label>
            <input
              value={voter.familyId || ""}
              disabled={!edit}
              onChange={(e) => setField("familyId", e.target.value)}
              placeholder="e.g., Jan Aadhaar"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>ID Type</label>
            <select
              value={voter.familyIdType || ""}
              disabled={!edit}
              onChange={(e) =>
                setField("familyIdType", (e.target.value || null) as FamilyIdType | null)
              }
              className={inputCls}
            >
              <option value="">Select</option>
              <option value="JAN_AADHAAR_FAMILY_ID">Jan Aadhaar</option>
              <option value="RATION_CARD_NO">Ration Card</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Role</label>
            <select
              value={voter.relationToHead || ""}
              disabled={!edit}
              onChange={(e) => {
                const v = (e.target.value || null) as FamilyRole | null;
                setField("relationToHead", v);
                if (v === "HEAD") setField("headId", null);
              }}
              className={inputCls}
            >
              <option value="">Select</option>
              <option value="HEAD">Head</option>
              <option value="SPOUSE">Spouse</option>
              <option value="CHILD">Child</option>
              <option value="PARENT">Parent</option>
              <option value="SIBLING">Sibling</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="flex items-end">
            {voter.relationToHead !== "HEAD" ? (
              <button
                type="button"
                onClick={onMakeHead}
                disabled={!edit}
                className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-base font-semibold hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <Crown size={14} className="sm:hidden" />
                <Crown size={18} className="hidden sm:block" />
                <span className="hidden sm:inline">Make Head</span>
                <span className="sm:hidden">Head</span>
              </button>
            ) : (
              <div className="w-full px-2 sm:px-4 py-1.5 sm:py-3 border-2 border-emerald-300 bg-emerald-50 rounded-lg sm:rounded-xl text-emerald-700 font-semibold flex items-center justify-center gap-1.5 text-xs sm:text-base">
                <Crown size={14} className="sm:hidden" />
                <Crown size={18} className="hidden sm:block" />
                <span className="hidden sm:inline">This person is the Head</span>
                <span className="sm:hidden">Head</span>
              </div>
            )}
          </div>
        </div>

        {voter.relationToHead !== "HEAD" && (
          <div className="grid grid-cols-1 gap-2 sm:gap-6">
            <div>
              <label className={labelCls}>Head (Internal ID or EPIC)</label>
              <input
                value={headInputValue}
                disabled={!edit}
                inputMode="text"
                placeholder="e.g. 12345 or XYZ7654321"
                onChange={(e) => {
                  setField("headId", (e.target.value || null) as unknown as any);
                }}
                className={inputCls}
              />
            </div>

            {headLinkTarget && (
              <div className="rounded-lg sm:rounded-xl border-2 border-blue-200 bg-blue-50 p-2 sm:p-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 text-blue-900 text-xs sm:text-sm">
                  <span>
                    Current Head:&nbsp;
                    <Link href={`/voters/${headLinkTarget}`} className="font-semibold hover:underline">
                      {headDisplay}
                    </Link>
                  </span>
                </div>
                <Link
                  href={`/voters/${headLinkTarget}`}
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline text-xs sm:text-sm font-medium"
                >
                  View <ExternalLink size={12} className="sm:hidden" /><ExternalLink size={14} className="hidden sm:block" />
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] sm:text-xs text-slate-500">
          Tip: Enter <b>internal numeric id</b> or the voter's <b>EPIC</b>.
        </p>
      </div>
    </div>
  );
}