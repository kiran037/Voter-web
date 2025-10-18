// src/components/home/VotersTable.tsx
"use client";

import {  User, X, MapPin, IdCard, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColourCode, VoterListItem, Voter, ListRow } from "@/types/voter";
import DeleteConfirmModal from "./DeleteConfirmModal";
import KebabMenu from "./kebab/KebabMenu";
import SelectionToolbar from "./table/SelectionToolbar";
import VoterCardMobile from "./table/VoterCardMobile";
import VoterRowDesktop from "./table/VoterRowDesktop";
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
function digitsOnly(s?: string | null) {
  return (s || "").replace(/\D/g, "");
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
  // ===== selection mode (admin-only) =====
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false); // ✅ ADDED

  const allSelected = useMemo(
    () => items.length > 0 && items.every((it) => selected.has(String(it.id))),
    [items, selected]
  );
  function toggleOne(id: string, checked: boolean) {
    setSelected((s) => {
      const next = new Set(s);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }
  function toggleAll(checked: boolean) {
    setSelected(() => {
      if (!checked) return new Set();
      return new Set(items.map((it) => String(it.id)));
    });
  }

  // ===== voted overrides (admin only) =====
  const [votedOverride, setVotedOverride] = useState<Record<string, boolean | undefined>>({});
  const [savingVote, setSavingVote] = useState<Record<string, boolean>>({});
  function effectiveVoted(it: VoterListItem) {
    const ov = votedOverride[String(it.id)];
    return typeof ov === "boolean" ? ov : it.voted;
  }
  async function flipVoted(id: string | number, currentValue: boolean) {
    if (!isAdmin) return;
    const key = String(id);
    const nextVal = !currentValue;
    setSavingVote((s) => ({ ...s, [key]: true }));
    setVotedOverride((m) => ({ ...m, [key]: nextVal }));
    try {
      const res = await fetch(`/api/voters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voted: nextVal }),
      });
      if (!res.ok) {
        setVotedOverride((m) => ({ ...m, [key]: currentValue }));
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "Failed to update voted status");
      } else {
        window.dispatchEvent(new CustomEvent("voters:refresh"));
      }
    } catch (e: any) {
      setVotedOverride((m) => ({ ...m, [key]: currentValue }));
      alert(e?.message || "Failed to update voted status");
    } finally {
      setSavingVote((s) => ({ ...s, [key]: false }));
    }
  }

  // ===== share modal state =====
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

  function downloadPdfFor(voterId: string | number) {
    (async () => {
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
    })();
  }
  function digitsOnlyLocal(s?: string | null) {
    return (s || "").replace(/\D/g, "");
  }
  function callNumber(raw?: string | null) {
    const num = digitsOnlyLocal(raw);
    if (!num) return alert("No phone number");
    window.location.href = `tel:${num}`;
  }
  function whatsappNumber(raw?: string | null) {
    const num = digitsOnlyLocal(raw);
    if (!num) return alert("No phone number");
    window.open(`https://wa.me/${num}`, "_blank");
  }
  function shareWhatsAppThread() {
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

  // ---------- UI ----------
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
          {/* ===== Admin: selection controls header ===== */}
          {isAdmin && (
            <SelectionToolbar
              selectionMode={selectionMode}
              setSelectionMode={setSelectionMode}
              allSelected={allSelected}
              selectedCount={selected.size}
              onToggleAll={toggleAll}
              onClear={() => setSelected(new Set())}
              onOpenDeleteModal={() => setBulkOpen(true)} // ✅ keep only supported prop
            />
          )}

          {/* ===== MOBILE cards ===== */}
          <ul className="p-3 space-y-3 sm:hidden">
            {items.map((it) => {
              const votedNow = effectiveVoted(it);
              const saving = !!savingVote[String(it.id)];
              return (
                <VoterCardMobile
                  key={it.id}
                  isAdmin={isAdmin}
                  selectionMode={selectionMode}
                  selected={selected.has(String(it.id))}
                  onSelect={(checked) => toggleOne(String(it.id), checked)}
                  item={it}
                  votedNow={votedNow}
                  saving={saving}
                  onFlipVoted={() => flipVoted(it.id, votedNow)}
                  onDeleteAsk={() => onDeleteAsk(String(it.id))}
                  Kebab={
                    <KebabMenu
                      onShare={() => fetchVoterAndFamily(it.id)}
                      onDownload={() => downloadPdfFor(it.id)}
                      onCall={() => callNumber(it.mobile1)}
                      onWhatsApp={() => whatsappNumber(it.mobile1)}
                    />
                  }
                />
              );
            })}
          </ul>

          {/* ===== DESKTOP/TABLET table ===== */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {isAdmin && selectionMode && (
                    <th className="px-3 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-slate-300"
                        checked={allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </th>
                  )}
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
                {items.map((it) => {
                  const votedNow = effectiveVoted(it);
                  const saving = !!savingVote[String(it.id)];
                  return (
                    <VoterRowDesktop
                      key={it.id}
                      isAdmin={isAdmin}
                      selectionMode={selectionMode}
                      selected={selected.has(String(it.id))}
                      onSelect={(checked) => toggleOne(String(it.id), checked)}
                      item={it}
                      votedNow={votedNow}
                      saving={saving}
                      onFlipVoted={() => flipVoted(it.id, votedNow)}
                      onDeleteAsk={() => onDeleteAsk(String(it.id))}
                      Kebab={
                        <KebabMenu
                          onShare={() => fetchVoterAndFamily(it.id)}
                          onDownload={() => downloadPdfFor(it.id)}
                          onCall={() => callNumber(it.mobile1)}
                          onWhatsApp={() => whatsappNumber(it.mobile1)}
                        />
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* SHARE MODAL */}
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
                <button onClick={() => setShareOpen(false)} className="p-2 rounded-md hover:bg-slate-100" title="Close" type="button">
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
                          onClick={shareWhatsAppThread}
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border hover:bg-slate-50 active:scale-[0.99] transition text-center"
                          type="button"
                        >
                          <MessageCircle size={20} />
                          <span className="text-xs font-medium">WhatsApp</span>
                        </button>
                        <button
                          onClick={shareSMS}
                          className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border hover:bg-slate-50 active:scale-[0.99] transition text-center"
                          type="button"
                        >
                          <MessageCircle size={20} />
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

      {/* BULK DELETE MODAL (admin only) */}
      {isAdmin && (
        <DeleteConfirmModal
          open={bulkOpen} // ✅ uses state added above
          onClose={() => setBulkOpen(false)}
          onDeleted={async () => {
            setSelected(new Set());
            setSelectionMode(false);
          }}
          ids={Array.from(selected)}
        />
      )}
    </div>
  );
}
