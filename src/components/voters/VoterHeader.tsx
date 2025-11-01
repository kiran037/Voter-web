"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  IdCard,
  MapPin,
  Sparkles,
} from "lucide-react";
import type { Voter, ListRow } from "@/types/voter";
import ShareActions from "@/components/voters/ShareActions";

export default function VoterHeader({
  voter,
  family,
  tab,
  onEdit,
  onSave,
  onCancel,
  saving,
  isEditing,
  which,
  canEditAll,
}: {
  voter: Voter;
  family?: ListRow[];
  tab: "details" | "family" | "survey";
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
  which: "details" | "survey";
  canEditAll: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl shadow-lg sm:shadow-2xl shadow-red-500/20 bg-gradient-to-br from-[#EF3340] via-[#E02030] to-[#C82333]">
      {/* overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
      <div className="absolute -right-12 -top-12 sm:-right-16 sm:-top-16 w-32 h-32 sm:w-40 sm:h-40 md:w-72 md:h-72 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -left-12 -bottom-12 sm:-left-16 sm:-bottom-16 w-32 h-32 sm:w-40 sm:h-40 md:w-72 md:h-72 bg-black/5 rounded-3xl blur-3xl" />

      {/* ===== Desktop actions (absolute top-right; hidden on mobile) ===== */}
      <div className="hidden sm:flex pointer-events-none absolute right-3 sm:right-4 top-3 sm:top-4 z-10 flex-col items-end gap-2">
        <div className="pointer-events-auto">
          <ShareActions voter={voter} family={family} />
        </div>

        {canEditAll && (
          <div className="pointer-events-auto flex gap-2">
            {tab === which && !isEditing && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-xl text-[#EF3340] rounded-lg text-sm font-semibold hover:bg-white hover:shadow-xl transition-all border border-white/50"
                type="button"
              >
                Edit {which === "details" ? "Details" : "Survey"}
              </button>
            )}
            {tab === which && isEditing && (
              <>
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold hover:bg-emerald-600 hover:shadow-xl transition-all disabled:opacity-50"
                  type="button"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={onCancel}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-xl text-slate-700 rounded-lg text-sm font-semibold hover:bg-white hover:shadow-xl transition-all border border-white/50"
                  type="button"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ===== Main content ===== */}
      <div className="relative p-2 sm:p-4 md:p-6 lg:p-8">
        {/* Top row: Back button + Edit/Save actions */}
        <div className="flex items-center justify-between mb-1.5 sm:mb-3 md:mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 sm:gap-2 text-white/80 hover:text-white group text-xs sm:text-sm md:text-base"
          >
            <ArrowLeft size={14} className="sm:hidden group-hover:-translate-x-1 transition-transform" />
            <ArrowLeft size={16} className="hidden sm:block group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back</span>
          </Link>

          {/* Mobile edit actions - top right */}
          {canEditAll && (
            <div className="sm:hidden flex items-center gap-1.5">
              {tab === which && !isEditing && (
                <button
                  onClick={onEdit}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-white text-[#EF3340] rounded-md text-[10px] font-semibold border border-white/60 active:scale-[0.98] min-w-[50px]"
                  type="button"
                >
                  Edit
                </button>
              )}
              {tab === which && isEditing && (
                <>
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-emerald-500 text-white rounded-md text-[10px] font-semibold active:scale-[0.98] disabled:opacity-50 min-w-[50px]"
                    type="button"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={onCancel}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1 bg-white text-slate-700 rounded-md text-[10px] font-semibold border border-white/60 active:scale-[0.98] min-w-[50px]"
                    type="button"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:gap-3 md:gap-4 lg:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            {/* identity */}
            <div className="flex items-start gap-2 sm:gap-3 md:gap-4 mb-1.5 sm:mb-3 md:mb-4">
              <div className="shrink-0 w-9 h-9 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur-xl rounded-lg sm:rounded-xl md:rounded-2xl border border-white/20 flex items-center justify-center text-white font-bold text-sm sm:text-lg md:text-xl shadow-lg sm:shadow-xl">
                {voter.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-white mb-0.5 sm:mb-1 md:mb-2 tracking-tight truncate">
                  {voter.name}
                </h1>

                {/* meta chips */}
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 md:gap-3 text-white/80 text-[10px] sm:text-xs md:text-sm">
                  <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-2.5 md:py-1 rounded-md sm:rounded-lg border border-white/20">
                    <IdCard size={11} className="sm:hidden" />
                    <IdCard size={14} className="hidden sm:block" />
                    <span className="truncate max-w-[6rem] sm:max-w-[9rem] md:max-w-none">
                      {voter.voterId || "No ID"}
                    </span>
                  </span>

                  {voter.village && (
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-2.5 md:py-1 rounded-md sm:rounded-lg border border-white/20">
                      <MapPin size={11} className="sm:hidden" />
                      <MapPin size={14} className="hidden sm:block" />
                      <span className="truncate max-w-[7rem] sm:max-w-[10rem] md:max-w-none">{voter.village}</span>
                    </span>
                  )}

                  {voter.age != null && (
                    <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-2.5 md:py-1 rounded-md sm:rounded-lg border border-white/20">
                      <Calendar size={11} className="sm:hidden" />
                      <Calendar size={14} className="hidden sm:block" />
                      {voter.age}y
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* status chips - only show important ones */}
            <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2">
              {voter.voted && (
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-md sm:rounded-lg md:rounded-2xl text-[10px] sm:text-xs md:text-sm font-semibold bg-white/90 text-emerald-700 border border-white/50 backdrop-blur-xl shadow-md sm:shadow-lg">
                  <CheckCircle size={12} className="sm:hidden" />
                  <CheckCircle size={14} className="hidden sm:block md:inline" />
                  <CheckCircle size={16} className="hidden md:inline lg:inline" />
                  Voted
                </span>
              )}

              {voter.starVoter && (
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-md sm:rounded-lg md:rounded-2xl text-[10px] sm:text-xs md:text-sm font-semibold bg-white/90 text-amber-700 border border-white/50 backdrop-blur-xl shadow-md sm:shadow-lg">
                  <Sparkles size={12} className="sm:hidden" />
                  <Sparkles size={14} className="hidden sm:block md:inline" />
                  <Sparkles size={16} className="hidden md:inline lg:inline" />
                  Star
                </span>
              )}

              {voter.dead && (
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-md sm:rounded-lg md:rounded-2xl text-[10px] sm:text-xs md:text-sm font-semibold bg-white/90 text-slate-700 border border-white/50 backdrop-blur-xl shadow-md sm:shadow-lg">
                  Deceased
                </span>
              )}
            </div>

            {/* ===== Mobile share actions - bottom right ===== */}
            <div className="sm:hidden mt-1.5 pt-1.5 border-t border-white/20 flex justify-end">
              <ShareActions voter={voter} family={family} className="text-xs" />
            </div>
            {/* ===== end mobile actions ===== */}
          </div>

          {/* right side empty; desktop actions are absolute */}
          <div className="hidden lg:block w-0" />
        </div>
      </div>
    </div>
  );
}