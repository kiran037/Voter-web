"use client";

import Modal from "./Modal";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export default function DeleteConfirmModal({
  id,
  ids,
  open,
  onClose,
  onDeleted,
}: {
  id?: string | null;              // single id (backwards compatible)
  ids?: string[] | null;           // optional bulk ids
  open: boolean;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const targets = useMemo<string[]>(() => {
    if (Array.isArray(ids) && ids.length) return ids;
    return id ? [id] : [];
  }, [id, ids]);

  // Focus the destructive button by default for quick Enter
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function doDelete() {
    if (targets.length === 0) return;
    setDeleting(true);
    setErr(null);

    const t = toast.loading(
      targets.length === 1 ? "Deleting voter..." : `Deleting ${targets.length} voters...`
    );
    try {
      if (targets.length === 1) {
        const res = await fetch(`/api/voters/${targets[0]}`, { method: "DELETE" });
        if (res.status === 401) {
          toast.dismiss(t);
          toast.error("Session expired. Please sign in again.");
          window.location.href = "/signin?next=/users";
          return;
        }
        if (!res.ok) throw new Error("Delete failed");
      } else {
        const res = await fetch(`/api/voters/bulk-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: targets }),
        });
        if (res.status === 401) {
          toast.dismiss(t);
          toast.error("Session expired. Please sign in again.");
          window.location.href = "/signin?next=/users";
          return;
        }
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || "Bulk delete failed");
        }
      }

      toast.dismiss(t);
      toast.success(targets.length === 1 ? "Voter deleted" : `Deleted ${targets.length} voters`);
      onClose();
      await onDeleted(); // parent updates list
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
      toast.dismiss(t);
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const many = targets.length > 1;
  const title = many ? `Delete ${targets.length} Voters` : "Delete Voter";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!deleting) void doDelete();
        }}
        className="space-y-4"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center border border-rose-200 shadow-sm">
            <Trash2 size={32} className="text-rose-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Are you sure?</h3>
          <p className="text-slate-600">
            {many
              ? "This will permanently delete the selected voters."
              : "This will permanently delete this voter."}{" "}
            This action cannot be undone.
          </p>
        </div>

        {err && (
          <div
            className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm"
            role="alert"
            aria-live="assertive"
          >
            {err}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-6 py-3 border-2 border-slate-300 rounded-xl font-medium hover:bg-white hover:border-slate-400 transition-all disabled:opacity-50"
          >
            No, Cancel
          </button>
          <button
            ref={confirmBtnRef}
            type="submit"
            disabled={deleting}
            className="px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
          >
            {deleting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
