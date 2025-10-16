"use client";

import Link from "next/link";
import {
  CheckCircle,
  Download,
  Eye,
  MessageCircle,
  Share2,
  Trash2,
  User,
  X,
  MapPin,
  IdCard,
} from "lucide-react";
import { useState } from "react";
import type { ColourCode, VoterListItem, Voter, ListRow } from "@/types/voter";
import { buildShareText } from "@/lib/share";

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
  isAdmin = false,
}: {
  items: VoterListItem[];
  loading: boolean;
  onDeleteAsk: (id: string) => void;
  isAdmin?: boolean;
}) {
  // ===== Share modal state =====
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [voterLoaded, setVoterLoaded] = useState<Voter | null>(null);
  const [familyLoaded, setFamilyLoaded] = useState<ListRow[]>([]);

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

  function shareWhatsApp() {
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

  async function downloadPdfFor(voterId: string | number) {
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
  }

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
          {/* ---------- MOBILE: separate cards; NO negative margins; NO divide bleed ---------- */}
          <ul className="p-3 space-y-3 sm:hidden">
            {items.map((it) => (
              <li key={it.id} className="rounded-xl border border-slate-200 p-3 bg-white shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900 truncate">{it.name}</div>
                      <span className={`shrink-0 inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getColorBadge(it.colourCode)}`}>
                        {it.colourCode}
                      </span>
                    </div>

                    {it.voterId && <div className="text-[11px] text-slate-500 mt-0.5">ID: {it.voterId}</div>}

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                      {it.village && <span>{it.village}</span>}
                      {(it.boothNo || it.partNo) && (
                        <span className="text-slate-500">
                          {it.boothNo && `Booth ${it.boothNo}`}
                          {it.boothNo && it.partNo && " • "}
                          {it.partNo && `Part ${it.partNo}`}
                        </span>
                      )}
                      {it.mobile1 && <span>📞 {it.mobile1}</span>}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5">
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

                    {/* compact bottom toolbar (no negative margins) */}
                    <div className="mt-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/voters/${it.id}`}
                          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100 active:scale-95 transition"
                          title="View"
                        >
                          <Eye size={18} className="text-slate-700" />
                        </Link>
                        <button
                          onClick={() => fetchVoterAndFamily(it.id)}
                          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100 active:scale-95 transition"
                          title="Share"
                        >
                          <Share2 size={18} className="text-[#EF3340]" />
                        </button>
                        <button
                          onClick={() => downloadPdfFor(it.id)}
                          className="inline-flex items-center justify-center rounded-md p-2 hover:bg-slate-100 active:scale-95 transition"
                          title="Download PDF"
                        >
                          <Download size={18} className="text-slate-700" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => onDeleteAsk(it.id)}
                            className="inline-flex items-center justify-center rounded-md p-2 hover:bg-rose-50 active:scale-95 transition"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-rose-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* ---------- DESKTOP/TABLET (unchanged) ---------- */}
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
                          {it.boothNo && `Booth ${it.boothNo}`}
                          {it.boothNo && it.partNo && " • "}
                          {it.partNo && `Part ${it.partNo}`}
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
                        <button
                          onClick={() => fetchVoterAndFamily(it.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Share (WhatsApp / SMS)"
                        >
                          <Share2 size={16} className="text-[#EF3340]" />
                        </button>
                        <button
                          onClick={() => downloadPdfFor(it.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Download PDF"
                        >
                          <Download size={16} className="text-slate-700" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => onDeleteAsk(it.id)}
                            className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-rose-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ======= SHARE MODAL ======= */}
      {shareOpen && (
        <div className="fixed inset-0 z-[100]">
          <button
            aria-label="Close"
            onClick={() => setShareOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg">
            <div className="mx-0 sm:mx-0 rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden pb-[max(16px,env(safe-area-inset-bottom))]">
              <div className="sm:hidden h-6 flex items-center justify-center">
                <div className="h-1.5 w-12 rounded-full bg-slate-200" />
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="font-semibold text-slate-800">Share voter</div>
                <button onClick={() => setShareOpen(false)} className="p-2 rounded-md hover:bg-slate-100" title="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {busy && <div className="text-sm text-slate-600">Loading…</div>}
                {errMsg && <div className="text-sm text-rose-600">{errMsg}</div>}

                {voterLoaded && (
                  <div className="rounded-xl border bg-slate-50 overflow-hidden">
                    <div className="px-3 py-2 border-b bg-white flex items-center gap-2 text-slate-700">
                      <IdCard size={16} />
                      <span className="font-semibold">{voterLoaded.name}</span>
                      {voterLoaded.voterId && (
                        <span className="ml-auto text-xs px-2 py-0.5 rounded bg-slate-100 border">
                          {voterLoaded.voterId}
                        </span>
                      )}
                    </div>

                    <div className="px-3 py-2 text-xs text-slate-600 flex items-center gap-2">
                      {voterLoaded.village && (
                        <>
                          <MapPin size={14} />
                          <span>{voterLoaded.village}</span>
                        </>
                      )}
                    </div>

                    <div className="p-3 space-y-2 bg-white">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={shareWhatsApp}
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border hover:bg-slate-50 active:scale-[0.99] transition text-center"
                        >
                          <MessageCircle size={20} className="text-green-600" />
                          <span className="text-xs font-medium">WhatsApp</span>
                        </button>
                        <button
                          onClick={shareSMS}
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border hover:bg-slate-50 active:scale-[0.99] transition text-center"
                        >
                          <MessageCircle size={20} className="text-sky-600" />
                          <span className="text-xs font-medium">SMS</span>
                        </button>
                      </div>

                      <div className="rounded-lg border bg-slate-50">
                        <textarea
                          readOnly
                          value={buildShareText(voterLoaded, familyLoaded)}
                          className="w-full h-40 text-xs leading-5 p-2 bg-transparent outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {!busy && !voterLoaded && !errMsg && (
                  <div className="text-sm text-slate-600">Preparing share…</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
