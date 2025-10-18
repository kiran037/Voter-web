// Users/xeoren/voter-web/src/components/home/DeleteConfirmModal.tsx
"use client";

import Modal from "./Modal";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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

  const targets = useMemo<string[]>(() => {
    if (Array.isArray(ids) && ids.length) return ids;
    return id ? [id] : [];
  }, [id, ids]);

  async function doDelete() {
    if (targets.length === 0) return;
    setDeleting(true);
    setErr(null);
    const t = toast.loading(
      targets.length === 1 ? "Deleting voter..." : `Deleting ${targets.length} voters...`
    );
    try {
      let failed = 0;
      for (const vid of targets) {
        const res = await fetch(`/api/voters/${vid}`, { method: "DELETE" });
        if (!res.ok) failed++;
      }
      toast.dismiss(t);
      if (failed === 0) {
        toast.success(
          targets.length === 1 ? "Voter deleted" : `Deleted ${targets.length} voters`
        );
        onClose();
        await onDeleted();
        // Let parent pages know they should refresh.
        window.dispatchEvent(new CustomEvent("voters:refresh"));
      } else {
        setErr(`${failed} of ${targets.length} deletions failed`);
        toast.error(`${failed} deletion(s) failed`);
      }
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
      toast.dismiss(t);
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const title =
    targets.length <= 1 ? "Delete Voter" : `Delete ${targets.length} Voters`;

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center border border-rose-200">
            <Trash2 size={32} className="text-rose-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Are you sure?</h3>
          <p className="text-slate-600">
            {targets.length <= 1
              ? "Do you want to delete this voter? This action cannot be undone."
              : "Do you want to delete all selected voters? This action cannot be undone."}
          </p>
        </div>

        {err && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm">
            {err}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-6 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            No, Cancel
          </button>
          <button
            onClick={doDelete}
            disabled={deleting}
            className="px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
          >
            {deleting ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
