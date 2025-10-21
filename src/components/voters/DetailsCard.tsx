"use client";

import { Building2, MapPin, Phone, Award, User } from "lucide-react";
import type { Voter } from "@/types/voter";

// local helper (same logic as page)
function calcAgeFromDOB(dobISO: string): number | null {
  const parts = dobISO?.split("-").map((x) => Number(x));
  if (!parts || parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const dob = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();
  const ny = now.getUTCFullYear();
  const nm = now.getUTCMonth();
  const nd = now.getUTCDate();

  let age = ny - y;
  if (nm < m - 1 || (nm === m - 1 && nd < d)) age -= 1;
  return age >= 0 && age < 150 ? age : null;
}

export default function DetailsCard({
  voter,
  edit,
  setField,
  isAdmin,
  onSaveContacts,
}: {
  voter: Voter;
  edit: boolean;
  setField: <K extends keyof Voter>(k: K, v: Voter[K]) => void;
  isAdmin: boolean;
  onSaveContacts: (mobile1?: string, mobile2?: string) => Promise<void> | void;
}) {
  const canEdit = isAdmin && edit;
  const displayAge = voter.age ?? (voter.dob ? calcAgeFromDOB(voter.dob) : null) ?? "";

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
                onChange={(e) => setField("voterId", e.target.value.toUpperCase() as any)}
                className={commonInputCls}
              />
            </div>

            {/* Father Name */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Father&apos;s Name</label>
              <input
                value={voter.fatherName || ""}
                disabled={!canEdit}
                onChange={(e) => setField("fatherName", e.target.value)}
                className={commonInputCls}
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
              <input
                value={displayAge}
                disabled={!canEdit}
                inputMode="numeric"
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, "");
                  setField("age", (onlyDigits ? Number(onlyDigits) : null) as any);
                }}
                className={commonInputCls}
              />
            </div>

            {/* Gender */}
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

            {/* DOB */}
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

      {/* Booth / Ward Details */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={20} className="text-[#EF3340]" />
            Booth & Ward Details
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {([
              ["boothName", "Booth Name", "text"],
              ["boothNo", "Booth No.", "numeric"],
              ["partNo", "Part No.", "numeric"],
              ["srn", "SRN", "numeric"],
            ] as const).map(([key, label, mode]) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
                <input
                  value={(voter as any)[key] ?? ""}
                  disabled={!canEdit}
                  inputMode={mode === "text" ? "text" : "numeric"}
                  onChange={(e) => {
                    if (mode === "text") {
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

            {/* Ward No */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Ward No.</label>
              <input
                value={voter.wardNo ?? ""}
                disabled={!canEdit}
                inputMode="numeric"
                onChange={(e) => {
                  const onlyDigits = e.target.value.replace(/\D/g, "");
                  setField("wardNo", (onlyDigits ? Number(onlyDigits) : null) as any);
                }}
                className={commonInputCls}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to white px-6 py-4 border-b border-slate-200">
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
                onBlur={() => { if (!isAdmin) onSaveContacts(); }}
                className={commonInputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile 2</label>
              <input
                value={voter.mobile2 || ""}
                disabled={isAdmin ? !canEdit : false}
                onChange={(e) => setField("mobile2", e.target.value)}
                onBlur={() => { if (!isAdmin) onSaveContacts(); }}
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
            {/* Party Support (NEW) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Party Support</label>
              <input
                value={voter.partySupport || ""}
                disabled={!canEdit}
                onChange={(e) => setField("partySupport", e.target.value)}
                placeholder="e.g., INC / BJP / BSP / Independent / Neutral"
                className={commonInputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Voter&apos;s Side</label>
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

            <div className="md:col-span-2 flex items-end gap-6">
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
