"use client";

import Link from "next/link";
import { CheckCircle, Eye, Trash2, X } from "lucide-react";
import type { VoterListItem } from "@/types/voter";
import { ReactNode } from "react";

type Props = {
  isAdmin: boolean;
  selectionMode: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  item: VoterListItem;
  votedNow: boolean;
  saving: boolean;
  onFlipVoted: () => void;
  onDeleteAsk: () => void;
  Kebab: ReactNode; // the kebab trigger element
};

export default function VoterCardMobile({
  isAdmin,
  selectionMode,
  selected,
  onSelect,
  item,
  votedNow,
  saving,
  onFlipVoted,
  onDeleteAsk,
  Kebab,
}: Props) {
  return (
    <li className="rounded-xl border border-slate-200 p-3 bg-white shadow-sm">
      <div className="flex items-start gap-3">
        {isAdmin && selectionMode && (
          <input
            type="checkbox"
            className="mt-1.5 w-4 h-4 rounded border-slate-300"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900 truncate">{item.name}</div>
            {item.colourCode && (
              <span className="shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-slate-50 text-slate-700">
                {item.colourCode}
              </span>
            )}
          </div>

          {item.voterId && <div className="text-[11px] text-slate-500 mt-0.5">ID: {item.voterId}</div>}

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
            {item.village && <span>{item.village}</span>}
            {(item.boothNo || item.partNo) && (
              <span className="text-slate-500">
                {item.boothNo && `Booth ${item.boothNo}`}
                {item.boothNo && item.partNo && " • "}
                {item.partNo && `Part ${item.partNo}`}
              </span>
            )}
            {item.mobile1 && <span>📞 {item.mobile1}</span>}
          </div>

          <div className="mt-1 flex items-center gap-2">
            {isAdmin ? (
              <button
                disabled={saving}
                onClick={onFlipVoted}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${
                  votedNow ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                } ${saving ? "opacity-60 cursor-not-allowed" : "active:scale-95"}`}
                title={votedNow ? "Mark Not Voted" : "Mark Voted"}
                type="button"
              >
                {votedNow ? <CheckCircle size={12} /> : <X size={12} />}
                {votedNow ? "Voted" : "Not"}
              </button>
            ) : (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                  votedNow ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                }`}
                title={votedNow ? "Voted" : "Not Voted"}
              >
                {votedNow ? <CheckCircle size={12} /> : <X size={12} />}
                {votedNow ? "Voted" : "Not"}
              </span>
            )}
            <span
              className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                item.dead ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {item.dead ? "Deceased" : "Alive"}
            </span>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
            <Link
              href={`/voters/${item.id}`}
              className="inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100 active:scale-95 transition"
              title="View"
            >
              <Eye size={18} className="text-slate-700" />
            </Link>

            {isAdmin && !selectionMode && (
              <button
                onClick={onDeleteAsk}
                className="inline-flex items-center justify-center rounded-md p-2 hover:bg-rose-50 active:scale-95 transition"
                title="Delete"
                type="button"
              >
                <Trash2 size={18} className="text-rose-600" />
              </button>
            )}

            {Kebab}
          </div>
        </div>
      </div>
    </li>
  );
}
