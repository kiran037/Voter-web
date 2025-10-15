// "use client";

import Link from "next/link";
import { CheckCircle, Eye, Trash2, User, X } from "lucide-react";
import type { ColourCode, VoterListItem } from "@/types/voter";

function getColorBadge(code: ColourCode) {
  const styles: Record<ColourCode, string> = {
    OUR: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    OPPOSITE: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    DOUBTFUL: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    OTHER: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  };
  return styles[code] || styles.OTHER;
}

export default function VotersTable({
  items,
  loading,
  onDeleteAsk,
}: {
  items: VoterListItem[];
  loading: boolean;
  onDeleteAsk: (id: string) => void;
}) {
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
          {/* Mobile: card list */}
          <ul className="divide-y divide-slate-200 sm:hidden">
            {items.map((it) => (
              <li key={it.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{it.name}</div>
                    {it.voterId && <div className="text-[11px] text-slate-500 mt-0.5">ID: {it.voterId}</div>}
                    <div className="text-xs text-slate-700 mt-1">{it.village || "-"}</div>
                    {(it.boothNo || it.partNo) && (
                      <div className="text-[11px] text-slate-500">
                        {it.boothNo && `Booth ${it.boothNo}`}{it.boothNo && it.partNo && " • "}{it.partNo && `Part ${it.partNo}`}
                      </div>
                    )}
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getColorBadge(it.colourCode)}`}>{it.colourCode}</span>
                      {it.voted ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle size={12} /> Voted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <X size={12} /> Not
                        </span>
                      )}
                      <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${it.dead ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                        {it.dead ? "Deceased" : "Alive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Link href={`/voters/${it.id}`} className="p-2 rounded-md hover:bg-slate-100" title="View">
                      <Eye size={18} className="text-slate-600" />
                    </Link>
                    <button onClick={() => onDeleteAsk(it.id)} className="p-2 rounded-md hover:bg-rose-50" title="Delete">
                      <Trash2 size={18} className="text-rose-600" />
                    </button>
                  </div>
                </div>
                {it.mobile1 && <div className="mt-2 text-xs text-slate-700">📞 {it.mobile1}</div>}
              </li>
            ))}
          </ul>

          {/* Desktop/tablet: table */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Voter Info</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Voter's Side</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Voted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{it.name}</div>
                      {it.voterId && <div className="text-xs text-slate-500 mt-1">ID: {it.voterId}</div>}
                    </td>
                    <td className="px-4 py-4">
                      {it.mobile1 ? <div className="text-sm text-slate-700">{it.mobile1}</div> : <span className="text-sm text-slate-400">No contact</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">{it.village || "-"}</div>
                      {(it.boothNo || it.partNo) && (
                        <div className="text-xs text-slate-500 mt-1">
                          {it.boothNo && `Booth ${it.boothNo}`}{it.boothNo && it.partNo && " • "}{it.partNo && `Part ${it.partNo}`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${getColorBadge(it.colourCode)}`}>{it.colourCode}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        {it.voted ? (
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center" title="Voted">
                            <CheckCircle size={18} className="text-emerald-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center" title="Not Voted">
                            <X size={18} className="text-rose-600" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        {it.dead ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Deceased</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Alive</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/voters/${it.id}`} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" title="View Details">
                          <Eye size={16} className="text-slate-600" />
                        </Link>
                        <button onClick={() => onDeleteAsk(it.id)} className="p-2 rounded-lg hover:bg-rose-50 transition-colors" title="Delete">
                          <Trash2 size={16} className="text-rose-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
