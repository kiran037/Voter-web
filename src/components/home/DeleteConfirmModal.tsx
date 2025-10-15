// src/components/home/DeleteConfirmModal.tsx
"use client";

import Modal from "./Modal";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DeleteConfirmModal({
  id,
  open,
  onClose,
  onDeleted,
}: {
  id: string | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doDelete() {
    if (!id) return;
    setDeleting(true);
    setErr(null);
    const t = toast.loading("Deleting voter...");
    try {
      const res = await fetch(`/api/voters/${id}`, { method: "DELETE" });
      const ok = res.ok;
      if (!ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "Delete failed");
        toast.dismiss(t);
        toast.error(j.error || "Delete failed");
        return;
      }
      toast.dismiss(t);
      toast.success("Voter deleted");
      onClose();
      await onDeleted();
    } catch (e: any) {
      setErr(e?.message || "Delete failed");
      toast.dismiss(t);
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Delete Voter">
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center border border-rose-200">
            <Trash2 size={32} className="text-rose-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Are you sure?</h3>
          <p className="text-slate-600">Do you want to delete this voter? This action cannot be undone.</p>
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
