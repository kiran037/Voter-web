// src/components/users/UserForm.tsx
"use client";

import { useEffect, useId, useMemo, useState } from "react";

type UserRole = "ADMIN" | "STAFF";
type UserRow = {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
};

export default function UserForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial?: Partial<UserRow>;
  onSubmit: (data: { phone: string; name: string; role: UserRole }) => void | Promise<void>;
  submitting: boolean;
}) {
  // Normalize any incoming phone (strip all non-digits, keep last 10 for UI)
  const initialDigits = useMemo(() => {
    const raw = (initial?.phone ?? "").replace(/\D/g, "");
    // if it already includes country code, trim to the last 10 as national significant number
    return raw.slice(-10);
  }, [initial?.phone]);

  const [digits, setDigits] = useState(initialDigits);
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<UserRole>((initial?.role as UserRole) || "STAFF");
  const [touched, setTouched] = useState<{ phone?: boolean; name?: boolean }>({});

  const phoneInputId = useId();
  const nameInputId = useId();
  const roleGroupId = useId();

  const phoneValid = /^\d{10}$/.test(digits);
  const errors = {
    phone: touched.phone && !phoneValid ? "Enter a valid 10-digit mobile number" : "",
  };

  // Construct E.164 on submit
  const e164 = useMemo(() => (phoneValid ? `+91${digits}` : ""), [phoneValid, digits]);

  useEffect(() => {
    // If initial changes, re-hydrate (rare, but safe)
    setDigits(initialDigits);
  }, [initialDigits]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ phone: true, name: touched.name });

    if (!phoneValid) return;
    await onSubmit({ phone: e164, name: name.trim(), role });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* PHONE */}
      <div>
        <label htmlFor={phoneInputId} className="block text-sm font-semibold text-slate-700 mb-2">
          Phone <span className="text-rose-600">*</span>
        </label>
        <div
          className={[
            "relative rounded-xl border",
            errors.phone ? "border-rose-300" : "border-slate-300",
            "bg-white focus-within:border-[#EF3340] focus-within:ring-2 focus-within:ring-[#EF3340]/20 transition-all",
          ].join(" ")}
        >
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-slate-600 border-r pr-3 select-none">
            <span className="text-sm font-semibold">+91</span>
          </div>
          <input
            id={phoneInputId}
            value={digits}
            onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            inputMode="numeric"
            pattern="\d*"
            placeholder="9876543210"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? `${phoneInputId}-error` : undefined}
            className="w-full pl-20 pr-4 py-3 rounded-xl outline-none"
            disabled={submitting}
            maxLength={10}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          {errors.phone ? (
            <p id={`${phoneInputId}-error`} className="text-xs font-medium text-rose-600">
              {errors.phone}
            </p>
          ) : (
            <p className="text-xs text-slate-500">We’ll store this as E.164 (e.g., +919876543210).</p>
          )}
          {digits && (
            <button
              type="button"
              onClick={() => setDigits("")}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
              disabled={submitting}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* NAME */}
      <div>
        <label htmlFor={nameInputId} className="block text-sm font-semibold text-slate-700 mb-2">
          Name <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          id={nameInputId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          placeholder="Full name"
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-[#EF3340] focus:ring-2 focus:ring-[#EF3340]/20 focus:outline-none transition-all"
          disabled={submitting}
        />
      </div>

      {/* ROLE: segmented control */}
      <div>
        <span className="block text-sm font-semibold text-slate-700 mb-2">Role</span>
        <div
          role="radiogroup"
          aria-labelledby={roleGroupId}
          className="inline-flex rounded-xl border border-slate-300 bg-white p-1 shadow-sm"
        >
          {(["STAFF", "ADMIN"] as UserRole[]).map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRole(r)}
                className={[
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                  active
                    ? "bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white shadow"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
                disabled={submitting}
              >
                {r === "STAFF" ? "Staff" : "Admin"}
              </button>
            );
          })}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="pt-1 flex gap-3">
        <button
          type="submit"
          disabled={submitting || !phoneValid}
          className={[
            "px-6 py-3 rounded-xl font-semibold transition-all",
            "bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white hover:shadow-lg active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        >
          {submitting ? "Saving..." : "Save"}
        </button>
        {/* Optional: add a lightweight reset if you want */}
        <button
          type="button"
          onClick={() => {
            setDigits(initialDigits);
            setName(initial?.name ?? "");
            setRole((initial?.role as UserRole) || "STAFF");
            setTouched({});
          }}
          disabled={submitting}
          className="px-5 py-3 rounded-xl font-semibold border border-slate-300 text-slate-700 hover:bg-white/60 transition-all"
        >
          Reset
        </button>
      </div>
    </form>
  );
}
