"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Modal from "./Modal";
import type { ColourCode, FamilyIdType, FamilyRole, Gender } from "@/types/voter";

export type AddForm = {
  name: string;
  voterId: string;
  age: string;
  gender: "" | Gender;
  village: string;
  houseNo: string;
  address: string;
  wardNo: string;          // numeric string
  fatherName: string;
  partySupport: string;
  boothName: string;
  boothNo: string;         // numeric string
  partNo: string;          // numeric string
  srn: string;             // numeric string
  mobile1: string;
  mobile2: string;
  email: string;
  colourCode: "" | ColourCode;
  voted: boolean;
  starVoter: boolean;
  dead: boolean;
  caste: string;
  profession: string;
  demands: string;
  extraInfo: string;
  dob: string;             // yyyy-mm-dd
  familyId: string;
  familyIdType: "" | FamilyIdType;
  relationToHead: "" | FamilyRole;
  headId: string;          // EPIC-like
};

function numOrNull(v: string) {
  return v && /^\d+$/.test(v) ? Number(v) : null;
}

const inputCls =
  "w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none transition";
const labelCls = "block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5";
const sectionCard = "rounded-xl sm:rounded-2xl border border-slate-200 bg-white";
const sectionHead =
  "px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200";
const sectionTitle = "text-base sm:text-lg font-bold text-slate-900";

export default function AddVoterModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  const empty: AddForm = useMemo(
    () => ({
      name: "",
      voterId: "",
      age: "",
      gender: "",
      village: "",
      houseNo: "",
      address: "",
      wardNo: "",
      fatherName: "",
      partySupport: "",
      boothName: "",
      boothNo: "",
      partNo: "",
      srn: "",
      mobile1: "",
      mobile2: "",
      email: "",
      colourCode: "",
      voted: false,
      starVoter: false,
      dead: false,
      caste: "",
      profession: "",
      demands: "",
      extraInfo: "",
      dob: "",
      familyId: "",
      familyIdType: "",
      relationToHead: "",
      headId: "",
    }),
    []
  );

  const [form, setForm] = useState<AddForm>(empty);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) setForm(empty);
  }, [open, empty]);

  function setF<K extends keyof AddForm>(k: K, v: AddForm[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // Keyboard: Cmd/Ctrl + Enter to submit
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault();
        const btn = document.getElementById("add-voter-submit");
        (btn as HTMLButtonElement | null)?.click?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const canSubmit =
    form.name.trim().length > 0 &&
    // if email present, do a super-lightweight check
    (!form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email));

  const pendingText = adding ? "Adding..." : "Add Voter";

  const sanitizeBeforeSend = useCallback(() => {
    // Uppercase EPIC-like fields here to keep it consistent
    const upper = (s: string) => (s ? s.toUpperCase() : s);

    return {
      name: form.name.trim(),
      voterId: form.voterId.trim() ? upper(form.voterId.trim()) : null,
      age: numOrNull(form.age),
      gender: form.gender || null,
      village: form.village.trim() || null,
      houseNo: form.houseNo.trim() || null,
      address: form.address.trim() || null,
      wardNo: numOrNull(form.wardNo),
      fatherName: form.fatherName.trim() || null,
      partySupport: form.partySupport.trim() || null,
      boothName: form.boothName.trim() || null,
      boothNo: numOrNull(form.boothNo),
      partNo: numOrNull(form.partNo),
      srn: numOrNull(form.srn),
      mobile1: form.mobile1.trim() || null,
      mobile2: form.mobile2.trim() || null,
      email: form.email.trim() || null,
      colourCode: (form.colourCode || "OTHER") as ColourCode,
      voted: !!form.voted,
      starVoter: !!form.starVoter,
      dead: !!form.dead,
      caste: form.caste.trim() || null,
      profession: form.profession.trim() || null,
      demands: form.demands.trim() || null,
      extraInfo: form.extraInfo.trim() || null,
      dob: form.dob || null,
      familyId: form.familyId.trim() ? upper(form.familyId.trim()) : null,
      familyIdType: form.familyIdType || null,
      relationToHead: form.relationToHead || null,
      headId: form.headId.trim() ? upper(form.headId.trim()) : null,
    } as const;
  }, [form]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || adding) return;

    setAdding(true);
    setAddErr(null);

    const t = toast.loading("Adding voter...");
    try {
      const payload = sanitizeBeforeSend();

      const res = await fetch("/api/voters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        toast.dismiss(t);
        toast.error("Session expired. Please sign in again.");
        window.location.href = "/signin?next=/";
        return;
      }

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = (j as { error?: string })?.error || "Failed to create";
        setAddErr(msg);
        toast.dismiss(t);
        toast.error(msg);
        return;
      }

      setForm(empty);
      onClose();
      await onCreated();
      toast.success("Voter added successfully");
    } catch (e: any) {
      const msg = e?.message || "Failed to create voter";
      setAddErr(msg);
      toast.dismiss(t);
      toast.error(msg);
    } finally {
      setAdding(false);
      toast.dismiss(t);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Voter" wide>
      <form onSubmit={onAdd} className="space-y-6">
        {/* Basic Info */}
        <section className={sectionCard}>
          <div className={sectionHead}>
            <h3 className={sectionTitle}>Basic Information</h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className={labelCls}>Full Name *</label>
              <input
                required
                className={inputCls}
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setF("name", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Father&apos;s Name</label>
              <input
                className={inputCls}
                placeholder="Father's Name"
                value={form.fatherName}
                onChange={(e) => setF("fatherName", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Voter ID (EPIC)</label>
              <input
                className={inputCls}
                placeholder="e.g., ABC1234567"
                value={form.voterId}
                onChange={(e) => setF("voterId", e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <label className={labelCls}>Age</label>
              <input
                className={inputCls}
                placeholder="Age"
                inputMode="numeric"
                value={form.age}
                onChange={(e) => setF("age", e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div>
              <label className={labelCls}>Gender</label>
              <select
                className={inputCls}
                value={form.gender}
                onChange={(e) => setF("gender", e.target.value as any)}
              >
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Date of Birth</label>
              <input
                className={inputCls}
                placeholder="YYYY-MM-DD"
                type="date"
                value={form.dob}
                onChange={(e) => setF("dob", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className={sectionCard}>
          <div className={sectionHead}>
            <h3 className={sectionTitle}>Address Details</h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className={labelCls}>Village</label>
              <input
                className={inputCls}
                placeholder="Village"
                value={form.village}
                onChange={(e) => setF("village", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>House No.</label>
              <input
                className={inputCls}
                placeholder="House No."
                value={form.houseNo}
                onChange={(e) => setF("houseNo", e.target.value)}
              />
            </div>

            <div>
              <label className={labelCls}>Ward No.</label>
              <input
                className={inputCls}
                placeholder="Ward No."
                inputMode="numeric"
                value={form.wardNo}
                onChange={(e) => setF("wardNo", e.target.value.replace(/\D/g, ""))}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-2">
              <label className={labelCls}>Address</label>
              <input
                className={inputCls}
                placeholder="Address"
                value={form.address}
                onChange={(e) => setF("address", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Booth */}
        <section className={sectionCard}>
          <div className={sectionHead}>
            <h3 className={sectionTitle}>Booth Information</h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Booth Name</label>
              <input
                className={inputCls}
                placeholder="Booth Name"
                value={form.boothName}
                onChange={(e) => setF("boothName", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Booth No.</label>
              <input
                className={inputCls}
                placeholder="Booth No."
                inputMode="numeric"
                value={form.boothNo}
                onChange={(e) => setF("boothNo", e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <label className={labelCls}>Part No.</label>
              <input
                className={inputCls}
                placeholder="Part No."
                inputMode="numeric"
                value={form.partNo}
                onChange={(e) => setF("partNo", e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <label className={labelCls}>SRN</label>
              <input
                className={inputCls}
                placeholder="SRN"
                inputMode="numeric"
                value={form.srn}
                onChange={(e) => setF("srn", e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className={sectionCard}>
          <div className={sectionHead}>
            <h3 className={sectionTitle}>Contact Information</h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Mobile 1</label>
              <input
                className={inputCls}
                placeholder="Mobile 1"
                inputMode="tel"
                value={form.mobile1}
                onChange={(e) => setF("mobile1", e.target.value.replace(/[^\d+]/g, ""))}
              />
            </div>
            <div>
              <label className={labelCls}>Mobile 2</label>
              <input
                className={inputCls}
                placeholder="Mobile 2"
                inputMode="tel"
                value={form.mobile2}
                onChange={(e) => setF("mobile2", e.target.value.replace(/[^\d+]/g, ""))}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                className={inputCls}
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setF("email", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Classification */}
        <section className={sectionCard}>
          <div className={sectionHead}>
            <h3 className={sectionTitle}>Classification & Status</h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Party Support</label>
              <input
                className={inputCls}
                placeholder="INC / BJP / BSP / Independent / Neutral"
                value={form.partySupport}
                onChange={(e) => setF("partySupport", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Colour Code</label>
              <select
                className={inputCls}
                value={form.colourCode}
                onChange={(e) => setF("colourCode", e.target.value as any)}
              >
                <option value="">Select (default Other)</option>
                <option value="OUR">Our</option>
                <option value="OPPOSITE">Opposite</option>
                <option value="DOUBTFUL">Doubtful</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-[#EF3340] focus:ring-[#EF3340]"
                  checked={form.voted}
                  onChange={(e) => setF("voted", e.target.checked)}
                />
                <span className="text-sm text-slate-700">Voted</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-[#EF3340] focus:ring-[#EF3340]"
                  checked={form.starVoter}
                  onChange={(e) => setF("starVoter", e.target.checked)}
                />
                <span className="text-sm text-slate-700">Star Voter</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-[#EF3340] focus:ring-[#EF3340]"
                  checked={form.dead}
                  onChange={(e) => setF("dead", e.target.checked)}
                />
                <span className="text-sm text-slate-700">Deceased</span>
              </label>
            </div>
          </div>
        </section>

        {/* Additional Info */}
        <section className={sectionCard}>
          <div className={sectionHead}>
            <h3 className={sectionTitle}>Additional Information</h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Caste</label>
              <input
                className={inputCls}
                placeholder="Caste"
                value={form.caste}
                onChange={(e) => setF("caste", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Profession</label>
              <input
                className={inputCls}
                placeholder="Profession"
                value={form.profession}
                onChange={(e) => setF("profession", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Demands</label>
              <input
                className={inputCls}
                placeholder="Demands"
                value={form.demands}
                onChange={(e) => setF("demands", e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Extra Info / Notes</label>
              <input
                className={inputCls}
                placeholder="Extra Info / Notes"
                value={form.extraInfo}
                onChange={(e) => setF("extraInfo", e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Family */}
        <section className={sectionCard}>
          <div className={sectionHead}>
            <h3 className={sectionTitle}>Family (Optional)</h3>
          </div>
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Family ID</label>
              <input
                className={inputCls}
                placeholder="Jan Aadhaar / Ration No."
                value={form.familyId}
                onChange={(e) => setF("familyId", e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className={labelCls}>Family ID Type</label>
              <select
                className={inputCls}
                value={form.familyIdType}
                onChange={(e) => setF("familyIdType", e.target.value as any)}
              >
                <option value="">Select</option>
                <option value="JAN_AADHAAR_FAMILY_ID">Jan Aadhaar Family Id</option>
                <option value="RATION_CARD_NO">Ration Card No</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Relation to Head</label>
              <select
                className={inputCls}
                value={form.relationToHead}
                onChange={(e) => setF("relationToHead", e.target.value as any)}
              >
                <option value="">Select</option>
                <option value="HEAD">Head</option>
                <option value="SPOUSE">Spouse</option>
                <option value="CHILD">Child</option>
                <option value="PARENT">Parent</option>
                <option value="SIBLING">Sibling</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Head Voter ID (EPIC)</label>
              <input
                className={inputCls}
                placeholder="A–Z / 0–9"
                value={form.headId}
                onChange={(e) =>
                  setF("headId", e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
                }
              />
            </div>
          </div>
          <p className="px-4 sm:px-6 pb-4 sm:pb-6 text-xs text-slate-500">
            If role is <b>HEAD</b>, you can leave <i>Head Voter ID</i> blank.
          </p>
        </section>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
          <button
            id="add-voter-submit"
            type="submit"
            disabled={adding || !canSubmit}
            className="px-6 py-3 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
          >
            {pendingText}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          {addErr && <p className="text-rose-600 text-sm">{addErr}</p>}
        </div>
      </form>
    </Modal>
  );
}
