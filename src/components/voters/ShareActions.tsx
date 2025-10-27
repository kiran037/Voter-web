// src/components/voters/ShareActions.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, Share2, X, MessageCircle } from "lucide-react";
import type { Voter, ListRow } from "@/types/voter";
import { buildShareText } from "@/lib/share";

type VotersListApi = {
  page: number;
  limit: number;
  total: number;
  items: Array<{
    id: string | number;
    name: string;
    voterId: string | null;
    village: string | null;
    mobile1: string | null;
    colourCode: "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";
  }>;
  error?: string;
};

export default function ShareActions({
  voter,
  family,
  className,
}: {
  voter: Voter;
  family?: ListRow[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  // local fallback family cache (when Family tab wasn't opened)
  const [fetchedFamily, setFetchedFamily] = useState<ListRow[] | null>(null);

  useEffect(() => setPortalReady(true), []);

  // Memoize the effective family list
  const effectiveFamily = useMemo<ListRow[]>(
    () => (family && family.length ? family : fetchedFamily) ?? [],
    [family, fetchedFamily]
  );

  // When the sheet opens, if we don't already have family but voter has familyId, fetch it.
  useEffect(() => {
    if (!open) return;
    if ((family && family.length) || fetchedFamily) return;
    if (!voter.familyId) return;

    const ctrl = new AbortController();
    (async () => {
      try {
        const usp = new URLSearchParams();
        if (voter.familyId) usp.set("q", voter.familyId);
        usp.set("limit", "200");

        const r = await fetch(`/api/voters?${usp.toString()}`, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        const j: VotersListApi = await r.json().catch(
          () => ({ page: 1, limit: 0, total: 0, items: [] }) as VotersListApi
        );
        if (!r.ok) throw new Error(j.error || "Failed to fetch family");

        const list: ListRow[] = j.items
          .filter((m) => String(m.id) !== String(voter.id))
          .map((m) => ({
            id: String(m.id),
            name: String(m.name ?? ""),
            voterId: m.voterId ?? null,
            village: m.village ?? null,
            mobile1: m.mobile1 ?? null,
            colourCode: m.colourCode ?? "OTHER",
          }));

        setFetchedFamily(list);
      } catch {
        // Silent fail; share text still works with voter-only details
      }
    })();

    return () => ctrl.abort();
  }, [open, voter.familyId, voter.id, family, fetchedFamily]);

  // Central builder to include ALL details (voter + survey + family)
  const shareText = useMemo(() => buildShareText(voter, effectiveFamily), [voter, effectiveFamily]);

  async function downloadPdf() {
    try {
      const r = await fetch(`/api/voters/${voter.id}/export.pdf`, { cache: "no-store" });
      if (!r.ok) throw new Error("Download failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voter-${voter.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download PDF.");
    }
  }

  function shareWhatsApp() {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }

  function shareSMS() {
    const encoded = encodeURIComponent(shareText);
    window.location.href = `sms:?&body=${encoded}`;
  }

  return (
    <>
      {/* Header action buttons */}
      <div className={`flex items-center gap-2 ${className || ""}`}>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-xl text-[#EF3340] border border-white/50 font-semibold shadow-sm hover:bg-white hover:shadow transition active:scale-[0.98]"
          title="Share"
          type="button"
        >
          <Share2 size={16} />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          onClick={downloadPdf}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-xl text-slate-800 border border-white/60 font-semibold shadow-sm hover:bg-white hover:shadow transition active:scale-[0.98]"
          title="Download PDF"
          type="button"
        >
          <Download size={16} />
          <span className="hidden sm:inline">PDF</span>
        </button>
      </div>

      {/* Popup via PORTAL */}
      {portalReady &&
        createPortal(
          open ? (
            <div className="fixed inset-0 z-[100]">
              {/* backdrop */}
              <button
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-md"
              />

              {/* sheet/dialog */}
              <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md">
                <div className="rounded-t-2xl sm:rounded-2xl bg-white/95 backdrop-blur-xl shadow-2xl border border-slate-200/60 overflow-hidden pb-[max(16px,env(safe-area-inset-bottom))]">
                  {/* drag handle (mobile) */}
                  <div className="sm:hidden h-6 flex items-center justify-center">
                    <div className="h-1.5 w-12 rounded-full bg-slate-300/70" />
                  </div>

                  {/* header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-white">
                    <div className="font-semibold text-slate-900 text-base">Share Voter</div>
                    <button
                      onClick={() => setOpen(false)}
                      className="p-2 rounded-lg hover:bg-slate-100/80 active:scale-95 transition"
                      title="Close"
                      type="button"
                    >
                      <X size={18} className="text-slate-600" />
                    </button>
                  </div>

                  {/* actions */}
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={shareWhatsApp}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/60 hover:bg-white hover:shadow-md active:scale-[0.98] transition text-center"
                      type="button"
                    >
                      <MessageCircle size={22} className="text-green-600" />
                      <span className="text-sm font-semibold text-slate-900">WhatsApp</span>
                    </button>
                    <button
                      onClick={shareSMS}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/60 hover:bg-white hover:shadow-md active:scale-[0.98] transition text-center"
                      type="button"
                    >
                      <MessageCircle size={22} className="text-sky-600" />
                      <span className="text-sm font-semibold text-slate-900">SMS</span>
                    </button>
                  </div>

                  {/* share preview */}
                  <div className="px-4 pb-4">
                    <div className="max-h-[50vh] overflow-auto rounded-2xl border border-slate-200/60 bg-slate-50/60 shadow-sm">
                      <textarea
                        readOnly
                        value={shareText}
                        className="w-full h-[45vh] text-xs leading-5 p-3 bg-transparent outline-none resize-none text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null,
          document.body
        )}
    </>
  );
}
