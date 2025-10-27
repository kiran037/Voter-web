// src/components/users/UsersList.tsx
"use client";

import { Pencil, Trash2, Shield, User as UserIcon, Clock } from "lucide-react";

type UserRole = "ADMIN" | "STAFF";
export type UserRow = {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
};

function initialsFrom(name?: string | null, fallback?: string) {
  const base =
    (name && name.trim()) ||
    (fallback && fallback.trim()) ||
    "";
  if (!base) return "U";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "U";
}

function formatPhone(phone: string) {
  // Try to prettify +91XXXXXXXXXX or 10-digit numbers
  const d = phone.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) {
    return `+91 ${d.slice(2, 6)}-${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 10) {
    return `+91 ${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (phone.startsWith("+")) return phone;
  return phone || "—";
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function RoleChip({ role }: { role: UserRole }) {
  const isAdmin = role === "ADMIN";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border tracking-wide ${
        isAdmin
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-slate-50 text-slate-700 border-slate-200"
      }`}
      title={isAdmin ? "Administrator" : "Staff"}
    >
      {isAdmin ? (
        <Shield size={14} className="text-amber-600" />
      ) : (
        <UserIcon size={14} className="text-slate-500" />
      )}
      {role}
    </span>
  );
}

export default function UsersList({
  items,
  loading,
  onEdit,
  onDelete,
}: {
  items: UserRow[];
  loading: boolean;
  onEdit: (u: UserRow) => void;
  onDelete: (u: UserRow) => void;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden p-10 sm:p-12">
        <div className="flex items-center gap-4">
          <div className="inline-block w-10 h-10 sm:w-12 sm:h-12 border-4 border-slate-200 border-t-[#EF3340] rounded-full animate-spin" />
          <div className="space-y-2 flex-1">
            <div className="h-3 w-1/3 bg-slate-100 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden p-10 sm:p-12 text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 grid place-items-center shadow-inner">
          <UserIcon size={22} className="text-slate-400" />
        </div>
        <p className="text-slate-900 font-semibold text-base sm:text-lg">No users found</p>
        <p className="text-slate-500 text-sm mt-1">
          Try adjusting your search or add a new user.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-[1]">
            <tr className="text-slate-700">
              <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">
                Phone
              </th>
              <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">
                Created
              </th>
              <th scope="col" className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider">
                Updated
              </th>
              <th scope="col" className="px-5 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((u, idx) => {
              const init = initialsFrom(u.name, u.phone);
              return (
                <tr
                  key={u.id}
                  className={`group hover:bg-slate-50/70 transition-colors ${
                    idx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EF3340]/90 to-[#C82333]/90 text-white grid place-items-center font-bold shadow-sm">
                        {init}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {u.name || "—"}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          ID: {u.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-slate-800">{formatPhone(u.phone)}</div>
                  </td>
                  <td className="px-5 py-4">
                    <RoleChip role={u.role} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-700">
                      <Clock size={14} className="text-slate-400" />
                      {formatDateTime(u.createdAt)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-slate-700">
                      {u.updatedAt ? formatDateTime(u.updatedAt) : "—"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onEdit(u)}
                        className="p-2.5 rounded-full hover:bg-slate-100 active:scale-95 transition-all duration-150"
                        title="Edit"
                        aria-label={`Edit ${u.name || u.phone}`}
                      >
                        <Pencil size={18} className="text-slate-600" />
                      </button>
                      <button
                        onClick={() => onDelete(u)}
                        className="p-2.5 rounded-full hover:bg-rose-50 active:scale-95 transition-all duration-150"
                        title="Delete"
                        aria-label={`Delete ${u.name || u.phone}`}
                      >
                        <Trash2 size={18} className="text-rose-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-200">
        {items.map((u) => {
          const init = initialsFrom(u.name, u.phone);
          return (
            <div key={u.id} className="p-4 active:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#EF3340] to-[#C82333] text-white grid place-items-center font-bold shadow-sm">
                    {init}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">
                      {u.name || "—"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {formatPhone(u.phone)}
                    </div>
                  </div>
                </div>
                <RoleChip role={u.role} />
              </div>

              <div className="mt-2 text-[11px] text-slate-500">
                <span className="font-medium">ID:</span> {u.id}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Clock size={12} className="text-slate-400" />
                {formatDateTime(u.createdAt)}
              </div>
              {u.updatedAt && (
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Updated: {formatDateTime(u.updatedAt)}
                </div>
              )}

              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => onEdit(u)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-1">
                    <Pencil size={14} className="text-slate-600" />
                    Edit
                  </div>
                </button>
                <button
                  onClick={() => onDelete(u)}
                  className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-sm font-semibold text-rose-700 active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-1">
                    <Trash2 size={14} />
                    Delete
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
