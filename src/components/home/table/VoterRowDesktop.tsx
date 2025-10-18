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
  Kebab: ReactNode; // kebab trigger element
};

export default function VoterRowDesktop({
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
    <tr className="hover:bg-slate-50 transition-colors">
      {isAdmin && selectionMode && (
        <td className="px-3 py-4">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-slate-300"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
          />
        </td>
      )}
      <td className="px-4 py-4">
        <div className="font-semibold text-slate-900">{item.name}</div>
        {item.voterId && <div className="text-xs text-slate-500 mt-1">ID: {item.voterId}</div>}
      </td>
      <td className="px-4 py-4">
        {item.mobile1 ? <div className="text-sm text-slate-700">{item.mobile1}</div> : <span className="text-sm text-slate-400">No contact</span>}
      </td>
      <td className="px-4 py-4">
        <div className="text-sm text-slate-700">{item.village || "-"}</div>
        {(item.boothNo || item.partNo) && (
          <div className="text-xs text-slate-500 mt-1">
            {item.boothNo && `Booth ${item.boothNo}`}
            {item.boothNo && item.partNo && " • "}
            {item.partNo && `Part ${item.partNo}`}
          </div>
        )}
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-50 text-slate-700">
          {item.colourCode}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-center">
          {isAdmin ? (
            <button
              disabled={saving}
              onClick={onFlipVoted}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                votedNow ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"
              } ${saving ? "opacity-60 cursor-not-allowed" : "hover:shadow active:scale-95"}`}
              title={votedNow ? "Mark Not Voted" : "Mark Voted"}
              type="button"
            >
              {votedNow ? <CheckCircle size={16} /> : <X size={16} />}
              {votedNow ? "Voted" : "Not"}
            </button>
          ) : (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                votedNow ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"
              }`}
              title={votedNow ? "Voted" : "Not Voted"}
            >
              {votedNow ? <CheckCircle size={16} /> : <X size={16} />}
              {votedNow ? "Voted" : "Not"}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-center">
          {item.dead ? (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">Deceased</span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">Alive</span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/voters/${item.id}`} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" title="View">
            <Eye size={16} className="text-slate-600" />
          </Link>
          {isAdmin && !selectionMode && (
            <button
              onClick={onDeleteAsk}
              className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
              title="Delete"
              type="button"
            >
              <Trash2 size={16} className="text-rose-600" />
            </button>
          )}
          {Kebab}
        </div>
      </td>
    </tr>
  );
}
