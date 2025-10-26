"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import { Clock, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_MAX_BYTES = 4_500_000; // ~4.5 MB Vercel body limit
const MAX_BYTES =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_IMPORT_MAX_UPLOAD_BYTES
    ? Number(process.env.NEXT_PUBLIC_IMPORT_MAX_UPLOAD_BYTES)
    : DEFAULT_MAX_BYTES;

export default function ImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
}) {
  const [importing, setImporting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [status, setStatus] = useState<"PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [_completedAt, setCompletedAt] = useState<string | null>(null);

  // timers/guards
  const timerRef = useRef<number | null>(null);
  const pollerRef = useRef<number | null>(null);
  const hasNotifiedRef = useRef(false);

  const [elapsedSec, setElapsedSec] = useState(0);

  // reset when closing
  useEffect(() => {
    if (!open) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (pollerRef.current) window.clearInterval(pollerRef.current);
      hasNotifiedRef.current = false;

      setImporting(false);
      setBatchId(null);
      setStatus(null);
      setRowCount(0);
      setSuccessCount(0);
      setFailedCount(0);
      setStartedAt(null);
      setCompletedAt(null);
      setElapsedSec(0);
    }
  }, [open]);

  // tick elapsed while processing
  useEffect(() => {
    if (status === "PROCESSING" && startedAt) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      const start = new Date(startedAt).getTime();
      const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      tick();
      timerRef.current = window.setInterval(tick, 1000);
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  }, [status, startedAt]);

  const processed = successCount + failedCount;
  const progress = useMemo(() => {
    if (!rowCount || rowCount <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((processed / rowCount) * 100)));
  }, [processed, rowCount]);

  const etaText = useMemo(() => {
    if (!rowCount || processed === 0 || elapsedSec < 2) return "—";
    const rate = processed / elapsedSec;
    if (rate <= 0) return "—";
    const remaining = Math.max(0, rowCount - processed);
    const est = Math.ceil(remaining / rate);
    const m = Math.floor(est / 60);
    const s = est % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }, [rowCount, processed, elapsedSec]);

  // Poll while WORKING; stop in terminal states
  useEffect(() => {
    if (!batchId) return;
    if (status === "COMPLETED" || status === "FAILED") return;
    if (pollerRef.current) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const r = await fetch(`/api/imports/${batchId}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (cancelled || !r.ok) return;

        setStatus(j.status);
        setRowCount(j.rowCount || 0);
        setSuccessCount(j.successCount || 0);
        setFailedCount(j.failedCount || 0);
        setStartedAt(j.startedAt || null);
        setCompletedAt(j.completedAt || null);

        if (j.status === "COMPLETED" || j.status === "FAILED") {
          if (pollerRef.current) {
            window.clearInterval(pollerRef.current);
            pollerRef.current = null;
          }
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            if (j.status === "COMPLETED") {
              toast.success(`Import completed: ${j.successCount} success, ${j.failedCount} failed out of ${j.rowCount}`);
              await onImported();
            } else {
              toast.error("Import failed");
            }
          }
        }
      } catch {
        // ignore transient poll errors
      }
    };

    poll();
    pollerRef.current = window.setInterval(poll, 1500);

    return () => {
      cancelled = true;
      if (pollerRef.current) {
        window.clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [batchId, status, onImported]);

  async function onImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = (e.currentTarget.elements.namedItem("file") as HTMLInputElement) || null;
    if (!fileInput?.files || fileInput.files.length === 0) {
      toast.info("Please choose a CSV/XLSX file.");
      return;
    }
    const file = fileInput.files[0];

    // Client-side size guard for Vercel body limit
    if (typeof file.size === "number" && file.size > MAX_BYTES) {
      toast.error(
        `File too large for live upload (${(file.size / (1024 * 1024)).toFixed(2)} MB). ` +
          `Please split under ${(MAX_BYTES / (1024 * 1024)).toFixed(2)} MB or use the storage upload flow.`
      );
      return;
    }

    const toastId = toast.loading("Uploading file…");
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/voters/import", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.dismiss(toastId);
        // Nice error messages per status
        if (res.status === 401) {
          toast.error("You are not logged in.");
        } else if (res.status === 403) {
          toast.error("Only admins can import.");
        } else if (res.status === 413) {
          toast.error(
            j?.error ||
              `File too large for live upload. Limit ~${(MAX_BYTES / (1024 * 1024)).toFixed(2)} MB.`
          );
        } else {
          toast.error(j?.error || "Import failed");
        }
        setImporting(false);
        return;
      }

      toast.dismiss(toastId);

      if (j.batchId) {
        hasNotifiedRef.current = false;
        setBatchId(String(j.batchId));
        // start in PENDING; the poller will flip to PROCESSING/COMPLETED/FAILED
        setStatus(j.status ?? "PENDING");
        setImporting(false);
      } else {
        // (Synchronous import path – not expected here, but keep UX)
        toast.success(`Imported: ${j.successCount} success, ${j.failedCount} failed out of ${j.rowCount}`);
        fileInput.value = "";
        onClose();
        await onImported();
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Import failed");
      setImporting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Bulk Upload Voters">
      <form onSubmit={onImport} className="space-y-4">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-[#EF3340]/50 transition-colors">
          <Upload className="mx-auto text-slate-400 mb-3" size={40} />
          <input
            name="file"
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#EF3340] file:text-white hover:file:bg-[#C82333] file:cursor-pointer"
            disabled={!!batchId && (status === "PENDING" || status === "PROCESSING")}
          />
          <p className="text-xs text-slate-500 mt-2">
            CSV or XLSX files accepted. Large files process in the background.
            <br />
            <span className="text-slate-400">
              Max file size for live upload: {(MAX_BYTES / (1024 * 1024)).toFixed(2)} MB
            </span>
          </p>
        </div>

        {!batchId && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-medium mb-2">Accepted Headers:</p>
              <p className="text-xs text-blue-700">
                name, fatherName, <b>partySupport</b>, village, wardNo, voterId, phone/mobile, mobile2, colourCode, voted, starVoter, dead,
                boothNo, partNo, srn, age, gender, address, email,
                <br />
                <b>familyId</b>, <b>familyIdType</b>, <b>relationToHead</b>, <b>headId</b>, extraInfo, caste, profession, demands, dob
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={importing}
                className="px-6 py-3 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
              >
                {importing ? "Uploading..." : "Upload File"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {batchId && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              {(status === "PENDING" || status === "PROCESSING") ? <Loader2 className="animate-spin" size={16} /> : null}
              <span>Batch</span>
              <code className="px-1.5 py-0.5 rounded bg-slate-100 border text-[11px]">{batchId}</code>
              <span className="ml-2">Status:</span>
              <span className="font-semibold">{status}</span>
            </div>

            <div className="rounded-xl border p-4 bg-slate-50">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Progress</span>
                <span className="tabular-nums">{processed}/{rowCount || "?"} ({progress}%)</span>
              </div>
              <div className="W-full h-3 bg-white border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#EF3340] to-[#C82333] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>✅ Success: <span className="font-semibold tabular-nums">{successCount}</span></div>
                <div>❌ Failed: <span className="font-semibold tabular-nums">{failedCount}</span></div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <Clock size={16} />
                <span>Elapsed:</span>
                <span className="font-semibold tabular-nums">
                  {Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s
                </span>
                <span className="mx-2">•</span>
                <span>ETA:</span>
                <span className="font-semibold tabular-nums">{etaText}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {(status === "COMPLETED" || status === "FAILED") ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Close (runs in background)
                </button>
              )}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
