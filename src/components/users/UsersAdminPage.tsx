// src/components/users/UsersAdminPage.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useMe } from "@/hooks/useMe";

import Modal from "@/components/ui/Modal";
import UsersHeader from "@/components/users/UsersHeader";
import UsersList, { type UserRow } from "@/components/users/UsersList";
import UsersPagination from "@/components/users/UsersPagination";
import UserForm from "@/components/users/UserForm";

type UserRole = "ADMIN" | "STAFF";

const LIMIT = 50;

export default function UsersAdminPage() {
  const { loading: meLoading, isAdmin } = useMe();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  // query state
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [page, setPage] = useState<number>(Math.max(1, Number(sp.get("page") || "1")));

  // data
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);

  // debounce search
  const debounceRef = useRef<number | null>(null);
  const [debouncedQ, setDebouncedQ] = useState(q.trim());
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const next = q.trim();
      setDebouncedQ(next);
      setPage(1);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  // sync to URL
  useEffect(() => {
    const usp = new URLSearchParams();
    if (debouncedQ) usp.set("q", debouncedQ);
    usp.set("page", String(page));
    const qs = usp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [debouncedQ, page, router, pathname]);

  // load list (admin-only)
  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const usp = new URLSearchParams();
      usp.set("limit", String(LIMIT));
      usp.set("page", String(page));
      if (debouncedQ) usp.set("q", debouncedQ);

      const r = await fetch(`/api/users?${usp.toString()}`, { cache: "no-store", signal });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (r.status === 403) {
          toast.error("Forbidden", { description: "Admins only." });
        } else {
          toast.error("Failed to load users", { description: j?.error || "Please try again." });
        }
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(Array.isArray(j.items) ? j.items : []);
      setTotal(Number.isFinite(j.total) ? j.total : 0);
    } catch (e: any) {
      if (!signal?.aborted) {
        setItems([]);
        setTotal(0);
        toast.error("Failed to load users", { description: e?.message || "Please try again." });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    if (isAdmin) load(ctrl.signal);
    return () => ctrl.abort();
  }, [isAdmin, debouncedQ, page]);

  // modals
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  // create
  async function createUser(data: { phone: string; name: string; role: UserRole }) {
    setSaving(true);
    const t = toast.loading("Creating user...");
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, name: data.name || null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Create failed");
      toast.success("User created");
      setAddOpen(false);
      await load();
    } catch (e: any) {
      toast.error("Create failed", { description: e?.message || "Please try again." });
    } finally {
      setSaving(false);
      toast.dismiss(t);
    }
  }

  // update
  async function updateUser(id: string, data: { phone: string; name: string; role: UserRole }) {
    setSaving(true);
    const t = toast.loading("Saving changes...");
    try {
      const r = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, name: data.name || null }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Update failed");
      toast.success("User updated");
      setEditUser(null);
      await load();
    } catch (e: any) {
      toast.error("Update failed", { description: e?.message || "Please try again." });
    } finally {
      setSaving(false);
      toast.dismiss(t);
    }
  }

  // delete
  async function doDelete(id: string) {
    setSaving(true);
    const t = toast.loading("Deleting user...");
    try {
      const r = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Delete failed");
      toast.success("User deleted");
      setDeleteUser(null);
      if (items.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
      await load();
    } catch (e: any) {
      toast.error("Delete failed", { description: e?.message || "Please try again." });
    } finally {
      setSaving(false);
      toast.dismiss(t);
    }
  }

  // ----- render guards -----
  if (meLoading) {
    return (
      <div className="w-full mx-auto p-4 md:p-6">
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#EF3340] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full p-3 sm:p-4 md:p-6 min-h-screen">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
          <ShieldCheck className="mx-auto text-red-400 mb-2" />
          <div className="text-red-700 font-semibold text-lg">Admins only</div>
          <div className="text-red-600 text-sm mt-1">You don’t have permission to view this page.</div>
        </div>
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <main className="mx-auto w-full p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <UsersHeader total={total} q={q} setQ={setQ} onAdd={() => setAddOpen(true)} />

      <UsersList
        items={items}
        loading={loading}
        onEdit={(u) => setEditUser(u)}
        onDelete={(u) => setDeleteUser(u)}
      />

      <UsersPagination
        page={page}
        total={total}
        limit={LIMIT}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}  
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      {/* Add Modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New User">
        <UserForm submitting={saving} onSubmit={createUser} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (
          <UserForm
            initial={editUser}
            submitting={saving}
            onSubmit={(data) => updateUser(editUser.id, data)}
          />
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Delete User">
        <div className="space-y-4">
          <p className="text-slate-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{deleteUser?.name || deleteUser?.phone}</span>? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              className="px-6 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              onClick={() => setDeleteUser(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="px-6 py-3 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 transition-all"
              onClick={() => deleteUser && doDelete(deleteUser.id)}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
