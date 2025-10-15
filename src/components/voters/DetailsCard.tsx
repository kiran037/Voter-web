// src/components/voter/DetailsCard.tsx
"use client";

import { Building2, MapPin, Phone, Award, User } from "lucide-react";
import type { Voter } from "@/types/voter";

function computeAgeFromDob(dobISO: string | null): number | null {
  if (!dobISO) return null;
  const dob = new Date(dobISO + "T00:00:00");
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  const d = today.getDate() - dob.getDate();
  if (m < 0 || (m === 0 && d < 0)) years--;
  return years >= 0 ? years : null;
}

export default function DetailsCard({
  voter,
  edit,
  setField,
}: {
  voter: Voter;
  edit: boolean;
  setField: <K extends keyof Voter>(k: K, v: Voter[K]) => void;
}) {
  const computedAge = computeAgeFromDob(voter.dob);
  const ageDisplay = computedAge ?? voter.age ?? null;

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
                disabled={!edit}
                onChange={(e) => setField("name", e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Voter ID</label>
              <input
                value={voter.voterId || ""}
                disabled={!edit}
                onChange={(e) => setField("voterId", e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
              />
            </div>

            {/* Age is derived from DOB and is readOnly */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Age</label>
              <input
                value={ageDisplay ?? ""}
                disabled
                className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-700"
                readOnly
                aria-readonly
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
              <select
                value={voter.gender || ""}
                disabled={!edit}
                onChange={(e) => setField("gender", (e.target.value || null) as any)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
              >
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
              <input
                type="date"
                value={voter.dob || ""}
                disabled={!edit}
                onChange={(e) => {
                  const nextDob = e.target.value || null;
                  setField("dob", nextDob);
                  // keep age in sync for API consumers that still read `age`
                  const nextAge = computeAgeFromDob(nextDob);
                  setField("age", (nextAge as any) ?? null);
                }}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
              <input
                value={voter.address || ""}
                disabled={!edit}
                onChange={(e) => setField("address", e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
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
                  disabled={!edit}
                  inputMode={key === "boothName" ? "text" : "numeric"}
                  onChange={(e) => {
                    if (key === "boothName") {
                      setField(key as any, e.target.value);
                    } else {
                      const onlyDigits = e.target.value.replace(/\D/g, "");
                      setField(key as any, onlyDigits ? Number(onlyDigits) : null);
                    }
                  }}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
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
            {["mobile1", "mobile2", "email"].map((k) => (
              <div key={k}>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {k === "mobile1" ? "Mobile 1" : k === "mobile2" ? "Mobile 2" : "Email"}
                </label>
                <input
                  value={(voter as any)[k] || ""}
                  disabled={!edit}
                  onChange={(e) => setField(k as any, e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                />
              </div>
            ))}
          </div>
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
                disabled={!edit}
                onChange={(e) => setField("colourCode", e.target.value as any)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
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
                    disabled={!edit}
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

      {/* Address chunk */}
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
                disabled={!edit}
                onChange={(e) => setField("village", e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">House No.</label>
              <input
                value={voter.houseNo || ""}
                disabled={!edit}
                onChange={(e) => setField("houseNo", e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
