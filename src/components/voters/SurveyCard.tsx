"use client";

import { FileText } from "lucide-react";
import type { Voter } from "@/types/voter";

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

export default function SurveyCard({
  voter,
  edit,
  setField,
}: {
  voter: Voter;
  edit: boolean;
  setField: <K extends keyof Voter>(k: K, v: Voter[K]) => void;
}) {
  return (
    <div className={cardCls}>
      <div className={headerCls}>
        <h3 className={titleCls}>
          <span className="inline-flex w-5 h-5 sm:w-8 sm:h-8 items-center justify-center rounded-full bg-[#EF3340]/10">
            <FileText size={14} className="sm:hidden text-[#EF3340]" />
            <FileText size={18} className="hidden sm:block text-[#EF3340]" />
          </span>
          <span className="text-xs sm:text-lg">Survey Information</span>
        </h3>
      </div>

      <div className="p-3 sm:p-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-6 mb-3 sm:mb-6">
          <div>
            <label className={labelCls}>Caste</label>
            <input
              value={voter.caste || ""}
              disabled={!edit}
              onChange={(e) => setField("caste", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Profession</label>
            <input
              value={voter.profession || ""}
              disabled={!edit}
              onChange={(e) => setField("profession", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="space-y-2 sm:space-y-6">
          <div>
            <label className={labelCls}>Demands</label>
            <input
              value={voter.demands || ""}
              disabled={!edit}
              onChange={(e) => setField("demands", e.target.value)}
              className={inputCls}
              placeholder="What does this voter want?"
            />
          </div>

          <div>
            <label className={labelCls}>Extra Info / Notes</label>
            <textarea
              value={voter.extraInfo || ""}
              disabled={!edit}
              onChange={(e) => setField("extraInfo", e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
              placeholder="Anything else worth remembering…"
            />
          </div>
        </div>
      </div>
    </div>
  );
}