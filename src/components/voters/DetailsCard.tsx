// // src/components/voters/DetailsCard.tsx
"use client";

import { Building2, MapPin, Phone, Award, User } from "lucide-react";
import type { Voter } from "@/types/voter";

export default function DetailsCard({
  voter,
  edit,
  setField,
  isAdmin,
  onSaveContacts,
}: {
  voter: Voter;
  edit: boolean; // page-level toggle (admins only)
  setField: <K extends keyof Voter>(k: K, v: Voter[K]) => void;
  isAdmin: boolean;
  onSaveContacts: (mobile1?: string, mobile2?: string) => Promise<void> | void; // for non-admin, save on blur
}) {
  // Admins can edit when `edit` is true. Non-admins: only mobile fields editable.
  const canEdit = isAdmin && edit;

  const commonInputCls =
    "w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all";

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <User size={20} className="text-[#EF3340]" />
            Basic Information
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
              <input
                required
                value={voter.name}
                disabled={!canEdit}
                onChange={(e) => setField("name", e.target.value)}
                className={commonInputCls}
              />
            </div>

            {/* Voter ID (always uppercase) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Voter ID</label>
              <input
                value={voter.voterId || ""}
                disabled={!canEdit}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  setField("voterId", upper as any);
                }}
                className={commonInputCls}
              />
            </div>

            {/* Age (editable) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
              <input
                value={voter.age ?? ""}
                disabled={!canEdit}
                inputMode="numeric"
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, "");
                  setField("age", (onlyDigits ? Number(onlyDigits) : null) as any);
                }}
                className={commonInputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
              <select
                value={voter.gender || ""}
                disabled={!canEdit}
                onChange={(e) => setField("gender", (e.target.value || null) as any)}
                className={commonInputCls}
              >
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>

            {/* DOB (no auto-age sync) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
              <input
                type="date"
                value={voter.dob || ""}
                disabled={!canEdit}
                onChange={(e) => setField("dob", (e.target.value || null) as any)}
                className={commonInputCls}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
              <input
                value={voter.address || ""}
                disabled={!canEdit}
                onChange={(e) => setField("address", e.target.value)}
                className={commonInputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Booth Details */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={20} className="text-[#EF3340]" />
            Booth Details
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {([
              ["boothName", "Booth Name"],
              ["boothNo", "Booth No."],
              ["partNo", "Part No."],
              ["srn", "SRN"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
                <input
                  value={(voter as any)[key] ?? ""}
                  disabled={!canEdit}
                  inputMode={key === "boothName" ? "text" : "numeric"}
                  onChange={(e) => {
                    if (key === "boothName") {
                      setField(key as any, e.target.value);
                    } else {
                      const onlyDigits = e.target.value.replace(/\D/g, "");
                      setField(key as any, (onlyDigits ? Number(onlyDigits) : null) as any);
                    }
                  }}
                  className={commonInputCls}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Phone size={20} className="text-[#EF3340]" />
            Contact Information
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile 1</label>
              <input
                value={voter.mobile1 || ""}
                disabled={isAdmin ? !canEdit : false}
                onChange={(e) => setField("mobile1", e.target.value)}
                onBlur={() => {
                  if (!isAdmin) onSaveContacts();
                }}
                className={commonInputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile 2</label>
              <input
                value={voter.mobile2 || ""}
                disabled={isAdmin ? !canEdit : false}
                onChange={(e) => setField("mobile2", e.target.value)}
                onBlur={() => {
                  if (!isAdmin) onSaveContacts();
                }}
                className={commonInputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input
                value={voter.email || ""}
                disabled={!canEdit}
                onChange={(e) => setField("email", e.target.value)}
                className={commonInputCls}
              />
            </div>
          </div>

          {!isAdmin && (
            <p className="mt-2 text-xs text-slate-500">
              Tip: Phone changes are saved automatically when you leave the field.
            </p>
          )}
        </div>
      </div>

      {/* Classification */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award size={20} className="text-[#EF3340]" />
            Classification & Status
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Voter's Side</label>
              <select
                value={voter.colourCode}
                disabled={!canEdit}
                onChange={(e) => setField("colourCode", e.target.value as any)}
                className={commonInputCls}
              >
                <option value="OUR">Our</option>
                <option value="OPPOSITE">Opposite</option>
                <option value="DOUBTFUL">Doubtful</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="flex items-end gap-6">
              {(["voted", "starVoter", "dead"] as const).map((flag) => (
                <label key={flag} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!(voter as any)[flag]}
                    disabled={!canEdit}
                    onChange={(e) => setField(flag, e.target.checked as any)}
                    className="w-5 h-5 rounded-lg border-slate-300 text-[#EF3340] focus:ring-[#EF3340] transition-all"
                  />
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                    {flag === "voted" ? "Voted" : flag === "starVoter" ? "Star Voter" : "Deceased"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin size={20} className="text-[#EF3340]" />
            Address Information
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Village</label>
              <input
                value={voter.village || ""}
                disabled={!canEdit}
                onChange={(e) => setField("village", e.target.value)}
                className={commonInputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">House No.</label>
              <input
                value={voter.houseNo || ""}
                disabled={!canEdit}
                onChange={(e) => setField("houseNo", e.target.value)}
                className={commonInputCls}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
