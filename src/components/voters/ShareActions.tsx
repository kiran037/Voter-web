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

  // Memoize the effective family list to avoid react-hooks warning noise
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
        const j: VotersListApi = await r.json().catch(() => ({ page: 1, limit: 0, total: 0, items: [] }));
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
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-[#E02030] border border-white/50 font-semibold shadow-sm hover:shadow transition"
          title="Share"
        >
          <Share2 size={16} />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          onClick={downloadPdf}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-slate-800 border border-white/60 font-semibold shadow-sm hover:shadow transition"
          title="Download PDF"
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
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              {/* sheet/dialog */}
              <div
                className="
                  absolute inset-x-0 bottom-0
                  sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                  w-full sm:max-w-md
                "
              >
                <div
                  className="
                    rounded-t-2xl sm:rounded-2xl
                    bg-white shadow-2xl border border-slate-200 overflow-hidden
                    pb-[max(16px,env(safe-area-inset-bottom))]
                  "
                >
                  {/* drag handle */}
                  <div className="sm:hidden h-6 flex items-center justify-center">
                    <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="font-semibold text-slate-800 text-base">Share voter</div>
                    <button
                      onClick={() => setOpen(false)}
                      className="p-2 rounded-md hover:bg-slate-100"
                      title="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* actions */}
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={shareWhatsApp}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border hover:bg-slate-50 active:scale-[0.99] transition text-center"
                    >
                      <MessageCircle size={22} className="text-green-600" />
                      <span className="text-sm font-medium">WhatsApp</span>
                    </button>
                    <button
                      onClick={shareSMS}
                      className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border hover:bg-slate-50 active:scale-[0.99] transition text-center"
                    >
                      <MessageCircle size={22} className="text-sky-600" />
                      <span className="text-sm font-medium">SMS</span>
                    </button>
                  </div>

                  {/* share preview */}
                  <div className="px-4 pb-4">
                    <div className="max-h-[50vh] overflow-auto rounded-xl border bg-slate-50">
                      <textarea
                        readOnly
                        value={shareText}
                        className="w-full h-[45vh] text-xs leading-5 p-3 bg-transparent outline-none resize-none"
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
