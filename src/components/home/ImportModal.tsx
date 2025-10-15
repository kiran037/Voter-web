// src/components/home/ImportModal.tsx
"use client";

import { useState } from "react";
import Modal from "./Modal";
import { Upload } from "lucide-react";
import { toast } from "sonner";

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

  async function onImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = (e.currentTarget.elements.namedItem("file") as HTMLInputElement) || null;
    if (!fileInput?.files || fileInput.files.length === 0) {
      toast.info("Please choose a CSV/XLSX file.");
      return;
    }
    const t = toast.loading("Uploading file...");
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", fileInput.files[0]);
      const res = await fetch("/api/voters/import", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.dismiss(t);
        toast.error(j.error || "Import failed");
      } else {
        toast.dismiss(t);
        toast.success(`Imported: ${j.successCount} success, ${j.failedCount} failed out of ${j.rowCount} rows`);
        fileInput.value = "";
        onClose();
        await onImported();
      }
    } catch (err: any) {
      toast.dismiss(t);
      toast.error(err?.message || "Import failed");
    } finally {
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
          />
          <p className="text-xs text-slate-500 mt-2">CSV or XLSX files accepted</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800 font-medium mb-2">Accepted Headers:</p>
          <p className="text-xs text-blue-700">
            name, village, voterId, phone/mobile, mobile2, colourCode, voted, starVoter, dead, boothNo, partNo, srn, age, gender, address, email,
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
          <button type="button" onClick={onClose} className="px-6 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
