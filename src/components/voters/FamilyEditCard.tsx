"use client";

import Link from "next/link";
import { Crown, ExternalLink, Users } from "lucide-react";
import type { FamilyIdType, FamilyRole, Voter } from "@/types/voter";

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
  const inputCls = "w-full px-3 py-2 sm:px-4 sm:py-3 border border-slate-300 rounded-lg sm:rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all text-sm sm:text-base";
  const labelCls = "block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2";

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-white px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <Users size={18} className="text-[#EF3340]" />
          Family (Head-based)
        </h3>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6">
          <div className="lg:col-span-2">
            <label className={labelCls}>Family ID</label>
            <input value={voter.familyId || ""} disabled={!edit} onChange={(e) => setField("familyId", e.target.value)} placeholder="e.g., Jan Aadhaar Family ID / Ration No." className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Family ID Type</label>
            <select value={voter.familyIdType || ""} disabled={!edit} onChange={(e) => setField("familyIdType", (e.target.value || null) as FamilyIdType | null)} className={inputCls}>
              <option value="">Select</option>
              <option value="JAN_AADHAAR_FAMILY_ID">Jan Aadhaar Family Id</option>
              <option value="RATION_CARD_NO">Ration Card No</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Role (relative to Head)</label>
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
              <button type="button" onClick={onMakeHead} disabled={!edit} className="w-full inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-60">
                <Crown size={18} />
                Make Head
              </button>
            ) : (
              <div className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-emerald-300 bg-emerald-50 rounded-lg sm:rounded-xl text-emerald-700 font-semibold flex items-center justify-center gap-2">
                <Crown size={18} /> This person is the Head
              </div>
            )}
          </div>
        </div>

        {voter.relationToHead !== "HEAD" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <div>
              <label className={labelCls}>Head Voter ID (numeric)</label>
              <input
                value={voter.headId || ""}
                disabled={!edit}
                inputMode="numeric"
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, "");
                  setField("headId", onlyDigits || null);
                }}
                className={inputCls}
              />
            </div>

            {voter.headId && (
              <div className="rounded-lg sm:rounded-xl border-2 border-blue-200 bg-blue-50 p-3 sm:p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-900 text-xs sm:text-sm">
                  <Crown size={16} />
                  <span>
                    Current Head:{" "}
                    <Link href={`/voters/${voter.headId}`} className="font-semibold hover:underline">
                      {voter.head?.name || voter.headId}
                    </Link>
                  </span>
                </div>
                <Link href={`/voters/${voter.headId}`} className="inline-flex items-center gap-1 text-blue-700 hover:underline text-xs sm:text-sm font-medium">
                  View <ExternalLink size={14} />
                </Link>
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] sm:text-xs text-slate-500">Tip: If you set role as <b>HEAD</b>, leave “Head Voter ID” blank.</p>
      </div>
    </div>
  );
}
