"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Modal from "./Modal";
import {
  Clock,
  Loader2,
  Upload,
  File as FileIcon,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  Clipboard,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const DEFAULT_MAX_BYTES = 4_500_000; // ~4.5 MB Vercel body limit
const MAX_BYTES =
  typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_IMPORT_MAX_UPLOAD_BYTES
    ? Number(process.env.NEXT_PUBLIC_IMPORT_MAX_UPLOAD_BYTES)
    : DEFAULT_MAX_BYTES;

// basic, local extension guard
const ALLOWED_EXT = [".csv", ".xlsx", ".xls"];
function hasAllowedExt(name: string) {
  const n = name.toLowerCase();
  return ALLOWED_EXT.some((ext) => n.endsWith(ext));
}

function prettyBytes(n: number) {
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void> | void;
}) {
  // ---------- selection ----------
  const [file, setFile] = useState<File | null>(null);
  const [selectErr, setSelectErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---------- upload/batch state ----------
  const [importing, setImporting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null
  >(null);
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

  // ---------- reset when closing ----------
  useEffect(() => {
    if (!open) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (pollerRef.current) window.clearInterval(pollerRef.current);
      timerRef.current = null;
      pollerRef.current = null;
      hasNotifiedRef.current = false;

      setFile(null);
      setSelectErr(null);

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

  // ---------- elapsed timer while processing ----------
  useEffect(() => {
    if (status === "PROCESSING" && startedAt) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      const start = new Date(startedAt).getTime();
      const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      tick();
      timerRef.current = window.setInterval(tick, 1000);
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
      };
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
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

  // ---------- polling ----------
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
              toast.success(
                `Import completed: ${j.successCount} success, ${j.failedCount} failed of ${j.rowCount}`
              );
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

    void poll();
    pollerRef.current = window.setInterval(poll, 1500);

    return () => {
      cancelled = true;
      if (pollerRef.current) {
        window.clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [batchId, status, onImported]);

  // ---------- handlers ----------
  const validateFile = useCallback((f: File | null) => {
    if (!f) return "Please choose a file.";
    if (!hasAllowedExt(f.name)) {
      return `Unsupported file type. Use: ${ALLOWED_EXT.join(", ")}`;
    }
    if (typeof f.size === "number" && f.size > MAX_BYTES) {
      return `File too large for live upload (${prettyBytes(
        f.size
      )}). Max ${(MAX_BYTES / (1024 * 1024)).toFixed(2)} MB.`;
    }
    return null;
  }, []);

  const onFilePick = (f: File | null) => {
    const err = validateFile(f);
    setSelectErr(err);
    setFile(err ? null : f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0] ?? null;
    onFilePick(f);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  async function onImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setSelectErr("Please choose a CSV/XLSX file.");
      return;
    }
    const err = validateFile(file);
    if (err) {
      setSelectErr(err);
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
        setStatus(j.status ?? "PENDING");
        setImporting(false);
      } else {
        // synchronous import (unlikely)
        toast.success(
          `Imported: ${j.successCount} success, ${j.failedCount} failed of ${j.rowCount}`
        );
        inputRef.current && (inputRef.current.value = "");
        onClose();
        await onImported();
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Import failed");
      setImporting(false);
    }
  }

  const canSubmit = !!file && !importing && !batchId;

  // ---------- UI ----------
  return (
    <Modal open={open} onClose={onClose} title="Bulk Upload Voters">
      <form onSubmit={onImport} className="space-y-5">
        {/* Dropzone / Picker */}
        {!batchId && (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") inputRef.current?.click();
            }}
            onClick={() => inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            className={`
              group relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center
              transition-all cursor-pointer
              ${selectErr ? "border-rose-300 bg-rose-50/50" : "border-slate-300 hover:border-[#EF3340]/60 hover:bg-rose-50/40"}
            `}
          >
            <div className="pointer-events-none">
              <Upload className="mx-auto text-slate-400 mb-3 group-hover:scale-105 transition-transform" size={42} />
              <div className="text-slate-800 font-semibold">
                Drag & drop CSV/XLSX here, or <span className="text-[#EF3340] underline">browse</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Max size {(MAX_BYTES / (1024 * 1024)).toFixed(2)} MB • Accepted: .csv, .xlsx
              </div>
            </div>

            <input
              ref={inputRef}
              name="file"
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
              onChange={(e) => onFilePick(e.currentTarget.files?.[0] ?? null)}
              disabled={importing}
            />

            {file && (
              <div className="mt-4 inline-flex items-center gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm">
                <FileIcon size={18} className="text-slate-500" />
                <div className="text-left">
                  <div className="text-sm font-medium text-slate-800 truncate max-w-[50vw] sm:max-w-[28rem]">
                    {file.name}
                  </div>
                  <div className="text-xs text-slate-500">{prettyBytes(file.size)}</div>
                </div>
                <button
                  type="button"
                  aria-label="Clear file"
                  className="ml-1 p-1 rounded-md hover:bg-slate-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setSelectErr(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {selectErr && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 text-sm">
                <AlertTriangle size={16} />
                <span>{selectErr}</span>
              </div>
            )}
          </div>
        )}

        {/* Helper: accepted headers */}
        {!batchId && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm mb-1.5">
              <Info size={16} />
              Accepted Headers
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              name, fatherName, <b>partySupport</b>, village, wardNo, voterId, phone/mobile, mobile2,
              colourCode, voted, starVoter, dead, boothNo, partNo, srn, age, gender, address, email,{" "}
              <b>familyId</b>, <b>familyIdType</b>, <b>relationToHead</b>, <b>headId</b>, extraInfo, caste,
              profession, demands, dob
            </p>
          </div>
        )}

        {/* Actions (pre-upload) */}
        {!batchId && (
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit}
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
        )}

        {/* Batch progress */}
        {batchId && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
              {(status === "PENDING" || status === "PROCESSING") ? (
                <Loader2 className="animate-spin" size={16} />
              ) : status === "COMPLETED" ? (
                <CheckCircle2 className="text-emerald-600" size={16} />
              ) : (
                <AlertTriangle className="text-rose-600" size={16} />
              )}
              <span>Batch</span>
              <code className="px-1.5 py-0.5 rounded bg-slate-100 border text-[11px]">{batchId}</code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(batchId);
                  toast.success("Batch ID copied");
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                title="Copy batch ID"
              >
                <Clipboard size={14} />
                Copy
              </button>
              <span className="ml-2">Status:</span>
              <span
                className={`font-semibold ${status === "COMPLETED"
                    ? "text-emerald-700"
                    : status === "FAILED"
                      ? "text-rose-700"
                      : "text-slate-800"
                  }`}
              >
                {status}
              </span>
              {status === "FAILED" && (
                <button
                  type="button"
                  onClick={() => {
                    // allow upload again
                    setBatchId(null);
                    setStatus(null);
                    setRowCount(0);
                    setSuccessCount(0);
                    setFailedCount(0);
                    setElapsedSec(0);
                  }}
                  className="ml-auto inline-flex items-center gap-1 text-xs rounded-lg border px-2 py-1 hover:bg-slate-50"
                  title="Start a new import"
                >
                  <RefreshCw size={14} />
                  New import
                </button>
              )}
            </div>

            <div className="rounded-2xl border p-4 bg-slate-50">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Progress</span>
                <span className="tabular-nums">
                  {processed}/{rowCount || "?"} ({progress}%)
                </span>
              </div>
              <div className="w-full h-3 bg-white border rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${status === "FAILED"
                      ? "bg-rose-500"
                      : "bg-gradient-to-r from-[#EF3340] to-[#C82333]"
                    }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="text-slate-700">
                    Success: <span className="font-semibold tabular-nums">{successCount}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle size={16} className="text-rose-600" />
                  <span className="text-slate-700">
                    Failed: <span className="font-semibold tabular-nums">{failedCount}</span>
                  </span>
                </div>
              </div>


              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <Clock size={16} />
                <span>Elapsed:</span>
                <span className="font-semibold tabular-nums">
                  {Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s
                </span>
                <span className="mx-2 hidden sm:inline">•</span>
                <span>ETA:</span>
                <span className="font-semibold tabular-nums">{etaText}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {status === "COMPLETED" || status === "FAILED" ? (
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
