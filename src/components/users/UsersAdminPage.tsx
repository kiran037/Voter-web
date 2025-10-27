// src/components/users/UsersAdminPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type UsersApiResponse = {
  page: number;
  limit: number;
  total: number;
  items: UserRow[];
  error?: string;
};

export default function UsersAdminPage() {
  const { loading: meLoading, isAdmin } = useMe();
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  // ---------- query state ----------
  const spQ = sp.get("q") ?? "";
  const spPage = Math.max(1, Number(sp.get("page") || "1"));

  const [q, setQ] = useState(spQ);
  const [page, setPage] = useState<number>(spPage);

  // debounce search (and reset page on search change)
  const debounceRef = useRef<number | null>(null);
  const [debouncedQ, setDebouncedQ] = useState(spQ.trim());
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const next = q.trim();
      setDebouncedQ(next);
      setPage(1);
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  // ---------- sync to URL ----------
  useEffect(() => {
    const usp = new URLSearchParams();
    if (debouncedQ) usp.set("q", debouncedQ);
    usp.set("page", String(page));
    const qs = usp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [debouncedQ, page, router, pathname]);

  // ---------- data state ----------
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);

  // track the active request to avoid race updates
  const activeReqId = useRef(0);

  // build query string (memo to avoid unnecessary fetch calls)
  const listQS = useMemo(() => {
    const usp = new URLSearchParams();
    usp.set("limit", String(LIMIT));
    usp.set("page", String(page));
    if (debouncedQ) usp.set("q", debouncedQ);
    return usp.toString();
  }, [debouncedQ, page]);

  // ---------- fetch list ----------
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      const reqId = ++activeReqId.current;

      try {
        const r = await fetch(`/api/users?${listQS}`, { cache: "no-store", signal });
        const j: UsersApiResponse =
          (await r.json().catch(() => ({ page: 1, limit: LIMIT, total: 0, items: [] }))) as UsersApiResponse;

        // if a newer request finished first, ignore this one
        if (reqId !== activeReqId.current) return;

        if (!r.ok) {
          if (r.status === 403) {
            toast.error("Forbidden", { description: "Admins only." });
          } else if (r.status === 429) {
            toast.error("Rate limit", { description: "Too many requests. Please slow down." });
          } else {
            toast.error("Failed to load users", { description: j?.error || "Please try again." });
          }
          setItems([]);
          setTotal(0);
          return;
        }

        const list = Array.isArray(j.items) ? j.items : [];
        const count = Number.isFinite(j.total) ? j.total : 0;

        // If the page is past the end (e.g., after deletes), jump back safely
        const maxPage = Math.max(1, Math.ceil(count / LIMIT));
        if (page > maxPage && maxPage !== page) {
          setPage(maxPage);
          // don't setItems here; next effect run will fetch the corrected page
          return;
        }

        setItems(list);
        setTotal(count);
      } catch (e) {
        if (!signal?.aborted) {
          const msg = e instanceof Error ? e.message : "Please try again.";
          toast.error("Failed to load users", { description: msg });
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [listQS, page]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    if (isAdmin) void load(ctrl.signal);
    return () => ctrl.abort();
  }, [isAdmin, load]);

  // ---------- modals ----------
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  // ---------- keyboard shortcuts (fixed to ignore typing fields) ----------
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;

      // If the element or any ancestor is contentEditable
      if ((el as HTMLElement).closest?.('[contenteditable="true"]')) return true;

      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;

      // ARIA textboxes (e.g., some custom inputs)
      const role = el.getAttribute?.("role");
      if (role === "textbox" || role === "searchbox" || role === "combobox") return true;

      // If inside an element with role textbox (wrapper)
      if (el.closest?.('[role="textbox"], [role="searchbox"], [role="combobox"]')) return true;

      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (!isAdmin) return;

      // Ignore while typing OR composing (IME)
      // Some browsers expose isComposing on KeyboardEvent; if not present, it will be undefined/false.
      const isComposing = (e as any).isComposing === true;
      if (isComposing || isTypingTarget(e.target)) return;

      // Do not hijack browser reload (Cmd/Ctrl+R)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") return;

      // Add new (plain "n") – only when no modal is open and not typing
      if (e.key.toLowerCase() === "n" && !addOpen && !editUser && !deleteUser) {
        e.preventDefault();
        setAddOpen(true);
        return;
      }

      // Refresh list (plain "r") – only when no modal is open and not typing
      if (e.key.toLowerCase() === "r" && !addOpen && !editUser && !deleteUser) {
        e.preventDefault();
        const ctrl = new AbortController();
        void load(ctrl.signal);
        return;
      }

      // Global escape closes modals
      if (e.key === "Escape") {
        if (addOpen || editUser || deleteUser) {
          e.preventDefault();
          setAddOpen(false);
          setEditUser(null);
          setDeleteUser(null);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, addOpen, editUser, deleteUser, load]);

  // ---------- CRUD handlers ----------
  async function createUser(data: { phone: string; name: string; role: UserRole }) {
    setSaving(true);
    const t = toast.loading("Creating user...");
    try {
      const r = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, name: data.name || null }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j?.error || "Create failed");
      toast.success("User created");
      setAddOpen(false);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error("Create failed", { description: msg });
    } finally {
      setSaving(false);
      toast.dismiss(t);
    }
  }

  async function updateUser(id: string, data: { phone: string; name: string; role: UserRole }) {
    setSaving(true);
    const t = toast.loading("Saving changes...");
    try {
      const r = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, name: data.name || null }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j?.error || "Update failed");
      toast.success("User updated");
      setEditUser(null);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error("Update failed", { description: msg });
    } finally {
      setSaving(false);
      toast.dismiss(t);
    }
  }

  async function doDelete(id: string) {
    setSaving(true);
    const t = toast.loading("Deleting user...");
    try {
      const r = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j?.error || "Delete failed");
      toast.success("User deleted");
      setDeleteUser(null);

      // If this was the last item on the page, step back (load() guards will ensure correctness)
      if (items.length === 1 && page > 1) setPage((p) => Math.max(1, p - 1));
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error("Delete failed", { description: msg });
    } finally {
      setSaving(false);
      toast.dismiss(t);
    }
  }

  // ---------- render guards ----------
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
            <span className="font-semibold">{deleteUser?.name || deleteUser?.phone}</span>? This action cannot be
            undone.
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
