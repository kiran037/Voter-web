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
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl shadow-red-500/20 bg-gradient-to-br from-[#EF3340] via-[#E02030] to-[#C82333]">
      {/* overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />
      <div className="absolute -right-16 -top-16 w-40 h-40 sm:w-72 sm:h-72 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute -left-16 -bottom-16 w-40 h-40 sm:w-72 sm:h-72 bg-black/5 rounded-3xl blur-3xl" />

      {/* ===== Desktop actions (absolute top-right; hidden on mobile) ===== */}
      <div className="hidden sm:flex pointer-events-none absolute right-4 top-4 z-10 flex-col items-end gap-2">
        <div className="pointer-events-auto">
          <ShareActions voter={voter} family={family} />
        </div>

        {canEditAll && (
          <div className="pointer-events-auto flex gap-2">
            {tab === which && !isEditing && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-xl text-[#EF3340] rounded-lg text-sm font-semibold hover:bg-white hover:shadow-xl transition-all border border-white/50"
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
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={onCancel}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-xl text-slate-700 rounded-lg text-sm font-semibold hover:bg-white hover:shadow-xl transition-all border border-white/50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ===== Main content ===== */}
      <div className="relative p-4 sm:p-6 md:p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-3 sm:mb-6 group text-sm sm:text-base"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to List</span>
        </Link>

        <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            {/* identity */}
            <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/10 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-xl">
                {voter.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2 tracking-tight truncate">
                  {voter.name}
                </h1>

                {/* meta chips */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-white/80 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                    <IdCard size={14} />
                    <span className="truncate max-w-[9rem] sm:max-w-none">
                      {voter.voterId || "No ID"}
                    </span>
                  </span>

                  {voter.village && (
                    <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                      <MapPin size={14} />
                      <span className="truncate max-w-[10rem] sm:max-w-none">{voter.village}</span>
                    </span>
                  )}

                  {voter.age != null && (
                    <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/20">
                      <Calendar size={14} />
                      {voter.age} years
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* status chips */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-2xl text-xs sm:text-sm font-semibold backdrop-blur-xl border shadow-lg ${
                  voter.colourCode === "OUR"
                    ? "bg-emerald-500/90 text-white border-emerald-400/50"
                    : voter.colourCode === "OPPOSITE"
                    ? "bg-rose-500/90 text-white border-rose-400/50"
                    : voter.colourCode === "DOUBTFUL"
                    ? "bg-amber-500/90 text-white border-amber-400/50"
                    : "bg-slate-500/90 text-white border-slate-400/50"
                }`}
              >
                {voter.colourCode}
              </span>

              {voter.voted && (
                <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-2xl text-xs sm:text-sm font-semibold bg-white/90 text-emerald-700 border border-white/50 backdrop-blur-xl shadow-lg">
                  <CheckCircle size={16} />
                  Voted
                </span>
              )}

              {voter.starVoter && (
                <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-2xl text-xs sm:text-sm font-semibold bg-white/90 text-amber-700 border border-white/50 backdrop-blur-xl shadow-lg">
                  <Sparkles size={16} />
                  Star
                </span>
              )}

              {voter.dead && (
                <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-2xl text-xs sm:text-sm font-semibold bg-white/90 text-slate-700 border border-white/50 backdrop-blur-xl shadow-lg">
                  Deceased
                </span>
              )}
            </div>

            {/* ===== Mobile actions moved to the very bottom of the card ===== */}
            <div className="sm:hidden mt-4 pt-3 border-t border-white/20">
              <div className="flex flex-wrap items-center gap-2">
                <ShareActions voter={voter} family={family} />
                {canEditAll && (
                  <>
                    {tab === which && !isEditing && (
                      <button
                        onClick={onEdit}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white text-[#EF3340] rounded-lg text-sm font-semibold border border-white/60"
                      >
                        Edit {which === "details" ? "Details" : "Survey"}
                      </button>
                    )}
                    {tab === which && isEditing && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={onSave}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={onCancel}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-white text-slate-700 rounded-lg text-sm font-semibold border border-white/60"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {/* ===== end mobile actions ===== */}
          </div>

          {/* right side empty; desktop actions are absolute */}
        </div>
      </div>
    </div>
  );
}
