// src/components/users/UsersList.tsx
"use client";

import { Pencil, Trash2 } from "lucide-react";

type UserRole = "ADMIN" | "STAFF";
export type UserRow = {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
};

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
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden p-10 sm:p-12 text-center">
        <div className="inline-block w-10 h-10 sm:w-12 sm:h-12 border-4 border-slate-200 border-t-[#EF3340] rounded-full animate-spin" />
        <p className="mt-3 sm:mt-4 text-slate-600 text-sm sm:text-base">Loading users...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden p-8 sm:p-12 text-center text-slate-600">
        No users found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Created</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{u.name || "—"}</div>
                  <div className="text-xs text-slate-500 mt-0.5">ID: {u.id}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-700">{u.phone}</div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      u.role === "ADMIN"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-slate-700">
                    {new Date(u.createdAt).toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(u)}
                      className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} className="text-slate-600" />
                    </button>
                    <button
                      onClick={() => onDelete(u)}
                      className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-rose-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-slate-200">
        {items.map((u) => (
          <div key={u.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{u.name || "—"}</div>
                <div className="text-xs text-slate-500 mt-0.5">ID: {u.id}</div>
              </div>
              <span
                className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                  u.role === "ADMIN"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                {u.role}
              </span>
            </div>
            <div className="mt-2 text-sm text-slate-700">{u.phone}</div>
            <div className="mt-1 text-xs text-slate-500">
              {new Date(u.createdAt).toLocaleString()}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => onEdit(u)}
                className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium"
              >
                <div className="flex items-center gap-1">
                  <Pencil size={14} className="text-slate-600" />
                  Edit
                </div>
              </button>
              <button
                onClick={() => onDelete(u)}
                className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-sm font-semibold text-rose-700"
              >
                <div className="flex items-center gap-1">
                  <Trash2 size={14} />
                  Delete
                </div>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
