// // src/components/home/AddVoterModal.tsx
"use client";

import Modal from "./Modal";
import { useState } from "react";
import { toast } from "sonner";
import type { ColourCode, FamilyIdType, FamilyRole, Gender } from "@/types/voter";

export type AddForm = {
  name: string;
  voterId: string;
  age: string;
  gender: "" | Gender;
  village: string;
  houseNo: string;
  address: string;
  boothName: string;
  boothNo: string;
  partNo: string;
  srn: string;
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
  dob: string; // yyyy-mm-dd
  familyId: string;
  familyIdType: "" | FamilyIdType;
  relationToHead: "" | FamilyRole;
  headId: string;
};

function numOrNull(v: string) {
  return v && /^\d+$/.test(v) ? Number(v) : null;
}

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
  const [form, setForm] = useState<AddForm>({
    name: "",
    voterId: "",
    age: "",
    gender: "",
    village: "",
    houseNo: "",
    address: "",
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
  });

  function setF<K extends keyof AddForm>(k: K, v: AddForm[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddErr(null);

    const t = toast.loading("Adding voter...");
    try {
      // enforce uppercase/format server-side too
      const payload: any = {
        name: form.name.trim(),
        voterId: (form.voterId.trim() ? form.voterId.trim().toUpperCase() : null),
        age: numOrNull(form.age),
        gender: form.gender || null,
        village: form.village.trim() || null,
        houseNo: form.houseNo.trim() || null,
        address: form.address.trim() || null,
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
        familyId: form.familyId.trim() ? form.familyId.trim().toUpperCase() : null,
        familyIdType: form.familyIdType || null,
        relationToHead: form.relationToHead || null,
        headId: form.headId.trim() ? form.headId.trim().toUpperCase() : null,
      };

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
        setAddErr(j?.error || "Failed to create");
        toast.dismiss(t);
        toast.error(j?.error || "Failed to create voter");
        return;
      }

      // reset + close
      setForm({
        name: "",
        voterId: "",
        age: "",
        gender: "",
        village: "",
        houseNo: "",
        address: "",
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
      });
      onClose();
      await onCreated();
      toast.success("Voter added successfully");
    } catch (e: any) {
      setAddErr(e?.message || "Failed to create");
      toast.dismiss(t);
      toast.error(e?.message || "Failed to create voter");
    } finally {
      setAdding(false);
      toast.dismiss(t);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add New Voter" wide>
      <form onSubmit={onAdd} className="space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              required
              className="col-span-full md:col-span-2 px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none"
              placeholder="Full Name *"
              value={form.name}
              onChange={(e) => setF("name", e.target.value)}
            />

            {/* Voter ID (always uppercase) */}
            <input
              className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none"
              placeholder="Voter ID"
              value={form.voterId}
              onChange={(e) => setF("voterId", e.target.value.toUpperCase())}
            />

            {/* Age (editable) */}
            <input
              className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none"
              placeholder="Age"
              inputMode="numeric"
              value={form.age}
              onChange={(e) => setF("age", e.target.value.replace(/\D/g, ""))}
            />

            <select
              className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none"
              value={form.gender}
              onChange={(e) => setF("gender", e.target.value as any)}
            >
              <option value="">Gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>

            <input
              className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none"
              placeholder="Date of Birth"
              type="date"
              value={form.dob}
              onChange={(e) => setForm((s) => ({ ...s, dob: e.target.value }))}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Address Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Village" value={form.village} onChange={(e) => setF("village", e.target.value)} />
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="House No." value={form.houseNo} onChange={(e) => setF("houseNo", e.target.value)} />
            <input className="col-span-full md:col-span-2 px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Address" value={form.address} onChange={(e) => setF("address", e.target.value)} />
          </div>
        </div>

        {/* Booth */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Booth Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Booth Name" value={form.boothName} onChange={(e) => setF("boothName", e.target.value)} />
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Booth No." inputMode="numeric" value={form.boothNo} onChange={(e) => setF("boothNo", e.target.value.replace(/\D/g, ""))} />
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Part No." inputMode="numeric" value={form.partNo} onChange={(e) => setF("partNo", e.target.value.replace(/\D/g, ""))} />
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="SRN" inputMode="numeric" value={form.srn} onChange={(e) => setF("srn", e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Mobile 1" value={form.mobile1} onChange={(e) => setF("mobile1", e.target.value)} />
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Mobile 2" value={form.mobile2} onChange={(e) => setF("mobile2", e.target.value)} />
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Email" value={form.email} onChange={(e) => setF("email", e.target.value)} />
          </div>
        </div>

        {/* Classification */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Classification & Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" value={form.colourCode} onChange={(e) => setF("colourCode", e.target.value as any)}>
              <option value="">Colour Code (default Other)</option>
              <option value="OUR">Our</option>
              <option value="OPPOSITE">Opposite</option>
              <option value="DOUBTFUL">Doubtful</option>
              <option value="OTHER">Other</option>
            </select>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#EF3340] focus:ring-[#EF3340]" checked={form.voted} onChange={(e) => setF("voted", e.target.checked)} />
                <span className="text-sm text-slate-700">Voted</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#EF3340] focus:ring-[#EF3340]" checked={form.starVoter} onChange={(e) => setF("starVoter", e.target.checked)} />
                <span className="text-sm text-slate-700">Star Voter</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-[#EF3340] focus:ring-[#EF3340]" checked={form.dead} onChange={(e) => setF("dead", e.target.checked)} />
                <span className="text-sm text-slate-700">Deceased</span>
              </label>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Caste" value={form.caste} onChange={(e) => setF("caste", e.target.value)} />
            <input className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Profession" value={form.profession} onChange={(e) => setF("profession", e.target.value)} />
            <input className="col-span-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Demands" value={form.demands} onChange={(e) => setF("demands", e.target.value)} />
            <input className="col-span-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" placeholder="Extra Info / Notes" value={form.extraInfo} onChange={(e) => setF("extraInfo", e.target.value)} />
          </div>
        </div>

        {/* Family */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Family (Optional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Family ID (always uppercase) */}
            <input
              className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none"
              placeholder="Family ID (e.g., Jan Aadhaar / Ration)"
              value={form.familyId}
              onChange={(e) => setF("familyId", e.target.value.toUpperCase())}
            />
            <select className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" value={form.familyIdType} onChange={(e) => setF("familyIdType", e.target.value as any)}>
              <option value="">Family ID Type</option>
              <option value="JAN_AADHAAR_FAMILY_ID">Jan Aadhaar Family Id</option>
              <option value="RATION_CARD_NO">Ration Card No</option>
              <option value="OTHER">Other</option>
            </select>
            <select className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none" value={form.relationToHead} onChange={(e) => setF("relationToHead", e.target.value as any)}>
              <option value="">Relation to Head</option>
              <option value="HEAD">Head</option>
              <option value="SPOUSE">Spouse</option>
              <option value="CHILD">Child</option>
              <option value="PARENT">Parent</option>
              <option value="SIBLING">Sibling</option>
              <option value="OTHER">Other</option>
            </select>

            {/* Head Voter ID (alphanumeric only, uppercase) */}
            <input
              className="px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none"
              placeholder="Head Voter ID (A–Z, 0–9)"
              value={form.headId}
              onChange={(e) =>
                setF("headId", e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())
              }
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Tip: If you set relation as <b>HEAD</b>, you can leave <i>Head Voter ID</i> blank.
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={adding || !form.name.trim()}
            className="px-6 py-3 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
          >
            {adding ? "Adding..." : "Add Voter"}
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
