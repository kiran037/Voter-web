"use client";

import Link from "next/link";
import { Crown, ExternalLink, IdCard, MapPin, Phone, Users } from "lucide-react";
import type { ColourCode, ListRow, Voter } from "@/types/voter";

// Shared theme tokens (keep in sync with DetailsCard/FamilyEditCard)
const cardCls =
  "bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 overflow-hidden";
const headerCls =
  "px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white border-b border-slate-200/60";
const titleCls = "text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2";

function getColorBadge(code: ColourCode) {
  const styles: Record<ColourCode, string> = {
    OUR: "bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 text-emerald-700 border-emerald-500/25 shadow-sm shadow-emerald-500/10",
    OPPOSITE: "bg-gradient-to-br from-rose-500/15 to-rose-600/10 text-rose-700 border-rose-500/25 shadow-sm shadow-rose-500/10",
    DOUBTFUL: "bg-gradient-to-br from-amber-500/15 to-amber-600/10 text-amber-700 border-amber-500/25 shadow-sm shadow-amber-500/10",
    OTHER: "bg-gradient-to-br from-slate-500/10 to-slate-600/8 text-slate-700 border-slate-500/20 shadow-sm shadow-slate-500/5",
  };
  return styles[code] || styles.OTHER;
}

export default function FamilyCard({
  voter,
  family,
  famLoading,
  famErr,
  onMakeHead,
}: {
  voter: Voter;
  family: ListRow[];
  famLoading: boolean;
  famErr: string | null;
  onMakeHead: () => void;
}) {
  // Safe reads for head fields
  const headObj = voter.head as unknown as Record<string, unknown> | undefined;
  const headEpic =
    headObj && typeof headObj === "object" && "voterId" in headObj
      ? (headObj as { voterId?: string | null }).voterId || undefined
      : undefined;

  const headDisplay =
    (headEpic && String(headEpic)) ||
    voter.head?.name ||
    (voter.headId ? String(voter.headId) : null);

  const headLinkTarget =
    (voter.head as unknown as { id?: string | number } | undefined)?.id ??
    voter.headId;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary bar */}
      <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <IdCard size={14} className="text-slate-400" />
            <span className="text-slate-600">Family ID:</span>
            <span className="font-bold text-slate-900">{voter.familyId || "—"}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Crown
              size={14}
              className={voter.relationToHead === "HEAD" ? "text-amber-500" : "text-slate-400"}
            />
            <span className="text-slate-600">Role:</span>
            <span className="font-bold text-slate-900">{voter.relationToHead || "—"}</span>
          </div>

          {headLinkTarget && voter.relationToHead !== "HEAD" && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Crown size={14} className="text-amber-500" />
              <span className="text-slate-600">Head:</span>
              <Link href={`/voters/${headLinkTarget}`} className="font-bold text-blue-600 hover:underline">
                {headDisplay}
              </Link>
            </div>
          )}

          {voter.relationToHead !== "HEAD" && (
            <button
              onClick={onMakeHead}
              className="ml-auto inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] transition-all"
              type="button"
            >
              <Crown size={14} />
              Make Head
            </button>
          )}
        </div>
      </div>

      {/* Members list card */}
      <div className={cardCls}>
        <div className={headerCls}>
          <h3 className={titleCls}>
            <span className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-[#EF3340]/10">
              <Users size={18} className="text-[#EF3340]" />
            </span>
            Family Members
          </h3>
        </div>

        {famLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-12 h-12 border-[3px] border-slate-200 border-t-[#EF3340] rounded-full animate-spin" />
            <p className="mt-4 text-slate-600 font-medium text-sm sm:text-base">
              Loading family members...
            </p>
          </div>
        ) : famErr ? (
          <div className="p-8 sm:p-12 text-center">
            <p className="text-rose-600 font-semibold text-sm sm:text-base">{famErr}</p>
          </div>
        ) : !voter.familyId ? (
          <div className="p-10 sm:p-20 text-center">
            <Users size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold text-sm sm:text-lg mb-1">No Family ID Set</p>
            <p className="text-slate-500 text-xs sm:text-sm">
              Set a Family ID in the Details tab to link family members
            </p>
          </div>
        ) : family.length === 0 ? (
          <div className="p-10 sm:p-20 text-center">
            <Users size={40} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold text-sm sm:text-lg mb-1">No Other Members Found</p>
            <p className="text-slate-500 text-xs sm:text-sm">
              Other profiles must share the same Family ID
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {family.map((m) => {
              const initials = (m.name || "?")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase())
                .join("");

              return (
                <Link
                  key={m.id}
                  href={`/voters/${m.id}`}
                  className="group relative rounded-2xl border border-slate-200/60 hover:border-[#EF3340] transition-all bg-white overflow-hidden hover:shadow-xl hover:shadow-red-500/10"
                >
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-[#EF3340]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-lg grid place-items-center text-slate-700 font-bold text-base sm:text-lg">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm sm:text-lg font-bold text-slate-900 truncate mb-0.5 sm:mb-1">
                          {m.name}
                        </h4>
                        {m.voterId && (
                          <p className="text-xs text-slate-500 truncate">ID: {m.voterId}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                      {m.village && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{m.village}</span>
                        </div>
                      )}
                      {m.mobile1 && (
                        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600">
                          <Phone size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{m.mobile1}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold border ${getColorBadge(
                          m.colourCode as ColourCode
                        )}`}
                      >
                        {m.colourCode}
                      </span>
                      <ExternalLink
                        className="text-slate-400 group-hover:text-[#EF3340] transition-colors"
                        size={16}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
