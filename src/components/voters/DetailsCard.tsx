"use client";

import { Building2, MapPin, Phone, Award, User } from "lucide-react";
import type { Voter } from "@/types/voter";

// ---- Theme tokens (match table/modals) ----
const cardCls =
  "bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-slate-200/60 overflow-hidden";
const headerCls =
  "px-3 sm:px-6 py-1.5 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white border-b border-slate-200/60 flex items-center gap-2";
const titleCls = "text-xs sm:text-lg font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2";
const labelCls = "block text-[10px] sm:text-sm font-semibold text-slate-700 mb-0.5 sm:mb-2";

// Inputs
const inputBase =
  "w-full px-2 py-1 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border transition-all outline-none disabled:bg-slate-50 disabled:text-slate-500 text-[11px] sm:text-base";
const inputRing =
  "border-slate-300 focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20";
const inputCls = `${inputBase} ${inputRing}`;

// Local helper (same logic as page)
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

  return (
    <div className="space-y-2 sm:space-y-6">
      {/* Basic Info */}
      <section className={cardCls}>
        <div className={headerCls}>
          <h3 className={titleCls}>
            <span className="inline-flex w-4 h-4 sm:w-8 sm:h-8 items-center justify-center rounded-full bg-[#EF3340]/10">
              <User size={12} className="sm:hidden text-[#EF3340]" />
              <User size={18} className="hidden sm:block text-[#EF3340]" />
            </span>
            <span className="text-[11px] sm:text-lg">Basic Info</span>
          </h3>
        </div>
        <div className="p-2 sm:p-6">
          {/* Mobile: 1 column, Desktop: 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 sm:gap-6">
            {/* Line 1 Mobile: Name (full) | Desktop: Name + Father's Name */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Name</label>
              <input
                required
                value={voter.name}
                disabled={!canEdit}
                onChange={(e) => setField("name", e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Father&apos;s Name</label>
              <input
                value={voter.fatherName || ""}
                disabled={!canEdit}
                onChange={(e) => setField("fatherName", e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Line 2 Mobile: Voter ID + Gender | Desktop: Voter ID + Gender + Age + DOB */}
            <div className="grid grid-cols-2 gap-1.5 sm:contents">
              <div className="sm:col-span-1">
                <label className={labelCls}>Voter ID</label>
                <input
                  value={voter.voterId || ""}
                  disabled={!canEdit}
                  onChange={(e) => setField("voterId", e.target.value.toUpperCase() as any)}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-1">
                <label className={labelCls}>Gender</label>
                <select
                  value={voter.gender || ""}
                  disabled={!canEdit}
                  onChange={(e) => setField("gender", (e.target.value || null) as any)}
                  className={inputCls}
                >
                  <option value="">Select</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="O">Other</option>
                </select>
              </div>
            </div>

            {/* Line 3 Mobile: Age + DOB | Desktop: continues in same row above */}
            <div className="grid grid-cols-2 gap-1.5 sm:col-span-2 sm:grid-cols-4 sm:gap-6">
              <div className="sm:col-span-1">
                <label className={labelCls}>Age</label>
                <input
                  value={displayAge}
                  disabled={!canEdit}
                  inputMode="numeric"
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    setField("age", (onlyDigits ? Number(onlyDigits) : null) as any);
                  }}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-3 max-w-full overflow-hidden">
                <label className={labelCls}>DOB</label>
                <input
                  type="date"
                  value={voter.dob || ""}
                  disabled={!canEdit}
                  onChange={(e) => setField("dob", (e.target.value || null) as any)}
                  className={`${inputCls} max-w-full`}
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Classification */}
      <section className={cardCls}>
        <div className={headerCls}>
          <h3 className={titleCls}>
            <span className="inline-flex w-4 h-4 sm:w-8 sm:h-8 items-center justify-center rounded-full bg-[#EF3340]/10">
              <Phone size={12} className="sm:hidden text-[#EF3340]" />
              <Phone size={18} className="hidden sm:block text-[#EF3340]" />
            </span>
            <span className="text-[11px] sm:text-lg">Contact & Status</span>
          </h3>
        </div>
        <div className="p-2 sm:p-6 space-y-2 sm:space-y-4">
          {/* Mobile: 3 lines, Desktop: 2 lines */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 sm:gap-6">
            {/* Line 1 Mobile: Mobile 1 + 2 | Desktop: Mobile 1 + 2 + Email + Party */}
            <div className="grid grid-cols-2 gap-1.5 sm:contents">
              <div className="sm:col-span-1">
                <label className={labelCls}>Mobile 1</label>
                <input
                  value={voter.mobile1 || ""}
                  disabled={isAdmin ? !canEdit : false}
                  onChange={(e) => setField("mobile1", e.target.value)}
                  onBlur={() => {
                    if (!isAdmin) onSaveContacts();
                  }}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-1">
                <label className={labelCls}>Mobile 2</label>
                <input
                  value={voter.mobile2 || ""}
                  disabled={isAdmin ? !canEdit : false}
                  onChange={(e) => setField("mobile2", e.target.value)}
                  onBlur={() => {
                    if (!isAdmin) onSaveContacts();
                  }}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Line 2 Mobile: Email | Desktop: continues above */}
            <div className="sm:col-span-1">
              <label className={labelCls}>Email</label>
              <input
                value={voter.email || ""}
                disabled={!canEdit}
                onChange={(e) => setField("email", e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Line 3 Mobile: Party + Side | Desktop: continues above */}
            <div className="grid grid-cols-2 gap-1.5 sm:contents">
              <div className="sm:col-span-1">
                <label className={labelCls}>Party Support</label>
                <input
                  value={voter.partySupport || ""}
                  disabled={!canEdit}
                  onChange={(e) => setField("partySupport", e.target.value)}
                  placeholder="INC/BJP"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-1">
                <label className={labelCls}>Side</label>
                <select
                  value={voter.colourCode}
                  disabled={!canEdit}
                  onChange={(e) => setField("colourCode", e.target.value as any)}
                  className={inputCls}
                >
                  <option value="OUR">Our</option>
                  <option value="OPPOSITE">Opposite</option>
                  <option value="DOUBTFUL">Doubtful</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Checkboxes - full width on both mobile and desktop */}
            <div className="sm:col-span-4 flex flex-wrap items-center gap-2 sm:gap-6 pt-1">
              {(["voted", "starVoter", "dead"] as const).map((flag) => (
                <label key={flag} className="flex items-center gap-1 sm:gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!(voter as any)[flag]}
                    disabled={!canEdit}
                    onChange={(e) => setField(flag, e.target.checked as any)}
                    className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-lg border-slate-300 text-[#EF3340] focus:ring-[#EF3340] focus:ring-2"
                  />
                  <span className="text-[10px] sm:text-sm font-semibold text-slate-700 group-hover:text-slate-900">
                    {flag === "voted" ? "Voted" : flag === "starVoter" ? "Star" : "Dead"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Location */}
      <section className={cardCls}>
        <div className={headerCls}>
          <h3 className={titleCls}>
            <span className="inline-flex w-4 h-4 sm:w-8 sm:h-8 items-center justify-center rounded-full bg-[#EF3340]/10">
              <MapPin size={12} className="sm:hidden text-[#EF3340]" />
              <MapPin size={18} className="hidden sm:block text-[#EF3340]" />
            </span>
            <span className="text-[11px] sm:text-lg">Location</span>
          </h3>
        </div>
        <div className="p-2 sm:p-6">
          {/* Mobile: 4 lines, Desktop: 3 lines */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 sm:gap-6">
            {/* Line 1: Address + Booth (Mobile: Address full, Desktop: Address + Booth) */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Address</label>
              <input
                value={voter.address || ""}
                disabled={!canEdit}
                onChange={(e) => setField("address", e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Booth</label>
              <input
                value={voter.boothName || ""}
                disabled={!canEdit}
                onChange={(e) => setField("boothName", e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Line 2 Mobile: House + Village | Desktop: House + Village + B.No + Part */}
            <div className="grid grid-cols-2 gap-1.5 sm:contents">
              <div className="sm:col-span-1">
                <label className={labelCls}>House No</label>
                <input
                  value={voter.houseNo || ""}
                  disabled={!canEdit}
                  onChange={(e) => setField("houseNo", e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-1">
                <label className={labelCls}>Village</label>
                <input
                  value={voter.village || ""}
                  disabled={!canEdit}
                  onChange={(e) => setField("village", e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Line 3 Mobile: B.No + Part + SRN + Ward (4 cols) | Desktop: continues above */}
            <div className="grid grid-cols-4 gap-1.5 sm:contents">
              <div className="sm:col-span-1">
                <label className={labelCls}>B.No</label>
                <input
                  value={voter.boothNo ?? ""}
                  disabled={!canEdit}
                  inputMode="numeric"
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    setField("boothNo", (onlyDigits ? Number(onlyDigits) : null) as any);
                  }}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-1">
                <label className={labelCls}>Part</label>
                <input
                  value={voter.partNo ?? ""}
                  disabled={!canEdit}
                  inputMode="numeric"
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    setField("partNo", (onlyDigits ? Number(onlyDigits) : null) as any);
                  }}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-1">
                <label className={labelCls}>SRN</label>
                <input
                  value={voter.srn ?? ""}
                  disabled={!canEdit}
                  inputMode="numeric"
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    setField("srn", (onlyDigits ? Number(onlyDigits) : null) as any);
                  }}
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-1">
                <label className={labelCls}>Ward</label>
                <input
                  value={voter.wardNo ?? ""}
                  disabled={!canEdit}
                  inputMode="numeric"
                  onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    setField("wardNo", (onlyDigits ? Number(onlyDigits) : null) as any);
                  }}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}