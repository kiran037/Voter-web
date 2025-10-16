// src/components/users/UserForm.tsx
"use client";

import { useState } from "react";

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
  const [phone, setPhone] = useState(initial?.phone || "");
  const [name, setName] = useState(initial?.name || "");
  const [role, setRole] = useState<UserRole>((initial?.role as UserRole) || "STAFF");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit({ phone: phone.trim(), name: name.trim(), role }); }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Phone *</label>
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+9198xxxxxxx"
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
        >
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      <div className="pt-2 flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-3 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 transition-all"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
