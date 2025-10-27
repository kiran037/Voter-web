// src/app/voters/[id]/VoterPage.tsx (or wherever this file lives)
// Drop-in replacement

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import type { Voter, ListRow, ColourCode, FamilyRole } from "@/types/voter";
import { useMe } from "@/hooks/useMe";

import VoterHeader from "@/components/voters/VoterHeader";
import DetailsCard from "@/components/voters/DetailsCard";
import FamilyEditCard from "@/components/voters/FamilyEditCard";
import FamilyCard from "@/components/voters/FamilyCard";
import SurveyCard from "@/components/voters/SurveyCard";

type Tab = "details" | "family" | "survey";

// --- helpers ---
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

// Resolve a "Head" reference that can be either an internal numeric id (digits)
// or an EPIC (alphanumeric). Returns the internal numeric id or null.
async function resolveHeadToNumericId(input: string): Promise<number | null> {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // digits-only? already an internal id
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  // otherwise try to resolve by EPIC (voterId)
  try {
    const usp = new URLSearchParams({ q: trimmed, limit: "5" });
    const r = await fetch(`/api/voters?${usp.toString()}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(j.items)) return null;

    // Prefer exact voterId (case-insensitive)
    const exact = j.items.find(
      (m: any) => (m?.voterId || "").toString().toUpperCase() === trimmed.toUpperCase()
    );
    if (exact?.id != null) return Number(exact.id);

    // Fallback: match ignoring spaces
    const normalized = trimmed.replace(/\s+/g, "").toUpperCase();
    const loose = j.items.find(
      (m: any) => (m?.voterId || "").toString().replace(/\s+/g, "").toUpperCase() === normalized
    );
    if (loose?.id != null) return Number(loose.id);

    return null;
  } catch {
    return null;
  }
}

export default function VoterPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useMe();

  const [tab, setTab] = useState<Tab>("details");

  // ----- load voter -----
  const [loading, setLoading] = useState(true);
  const [voter, setVoter] = useState<Voter | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return;
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`/api/voters/${id}`, { cache: "no-store", signal });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Failed to load");
        const dob = j.dob ? String(j.dob).slice(0, 10) : null;
        setVoter({ ...j, dob });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        if (signal?.aborted) return;
        setErr(msg);
        setVoter(null);
        toast.error("Failed to load voter", { description: msg });
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  // ----- setField wrapper (auto-calc age on dob change) -----
  function setField<K extends keyof Voter>(k: K, v: Voter[K]) {
    setVoter((s) => {
      if (!s) return s;
      if (k === "dob") {
        const nextDob = (v as unknown as string) || "";
        const nextAge = nextDob ? calcAgeFromDOB(nextDob) : null;
        return { ...s, dob: (nextDob || null) as Voter["dob"], age: nextAge };
      }
      return { ...s, [k]: v };
    });
  }

  // ----- edit states (admins only for full edit) -----
  const [editDetails, setEditDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const [editSurvey, setEditSurvey] = useState(false);
  const [savingSurvey, setSavingSurvey] = useState(false);

  // Save/Cancel helpers for which tab is active
  const whichEditable: "details" | "survey" = tab === "details" ? "details" : "survey";
  const isEditing = tab === "details" ? editDetails : tab === "survey" ? editSurvey : false;
  const saving = tab === "details" ? savingDetails : savingSurvey;

  // ---- keyboard: Ctrl/Cmd+S to save when editing ----
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isAdmin || !isEditing) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "s") {
        e.preventDefault();
        if (whichEditable === "details") void saveDetails();
        else void saveSurvey();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, isEditing, whichEditable]); // deps OK

  // ---- soft protection against navigation while editing ----
  useEffect(() => {
    if (!isEditing) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isEditing]);

  // ----- save handlers (admins) -----
  async function saveDetails(e?: React.FormEvent) {
    e?.preventDefault();
    if (!voter || !isAdmin) return;

    setSavingDetails(true);
    try {
      // resolve head as before...
      let resolvedHeadId: number | null = null;
      if (voter.relationToHead !== "HEAD") {
        const rawHead = (voter.headId ?? "").toString().trim();
        if (rawHead) {
          resolvedHeadId = await resolveHeadToNumericId(rawHead);
          if (resolvedHeadId == null) {
            setSavingDetails(false);
            toast.error("Invalid Head reference", {
              description: "We couldn’t find a voter matching the Head ID/EPIC you entered. Please check and try again.",
            });
            return;
          }
        }
      }

      const payload = {
        name: voter.name?.trim(),
        voterId: voter.voterId?.trim() || null,
        age: voter.age ?? null,
        gender: voter.gender || null,
        village: voter.village?.trim() || null,
        houseNo: voter.houseNo?.trim() || null,
        address: voter.address?.trim() || null,
        boothName: voter.boothName?.trim() || null,
        boothNo: voter.boothNo ?? null,
        partNo: voter.partNo ?? null,
        srn: voter.srn ?? null,
        mobile1: voter.mobile1?.trim() || null,
        mobile2: voter.mobile2?.trim() || null,
        email: voter.email?.trim() || null,
        colourCode: voter.colourCode,
        voted: !!voter.voted,
        starVoter: !!voter.starVoter,
        dead: !!voter.dead,
        dob: voter.dob || null,

        // NEW
        fatherName: voter.fatherName?.trim() || null,
        wardNo: voter.wardNo ?? null,
        partySupport: voter.partySupport?.trim() || null,

        // family
        familyId: voter.familyId?.trim() || null,
        familyIdType: voter.familyIdType || null,
        relationToHead: voter.relationToHead || null,
        headId: voter.relationToHead === "HEAD" ? null : resolvedHeadId,
      };

      const r = await fetch(`/api/voters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Save failed");

      setEditDetails(false);
      await load();
      toast.success("Voter details saved", { description: "All changes have been updated." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error("Save failed", { description: msg });
    } finally {
      setSavingDetails(false);
    }
  }

  function cancelDetails() {
    setEditDetails(false);
    load();
  }

  async function saveSurvey(e?: React.FormEvent) {
    e?.preventDefault();
    if (!voter || !isAdmin) return;

    setSavingSurvey(true);
    try {
      const payload = {
        caste: voter.caste?.trim() || null,
        profession: voter.profession?.trim() || null,
        demands: voter.demands?.trim() || null,
        extraInfo: voter.extraInfo?.trim() || null,
      };
      const r = await fetch(`/api/voters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Save failed");

      setEditSurvey(false);
      await load();
      toast.success("Survey updated", { description: "Survey information has been saved." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error("Save failed", { description: msg });
    } finally {
      setSavingSurvey(false);
    }
  }

  function cancelSurvey() {
    setEditSurvey(false);
    load();
  }

  // ----- Non-admin: allow ONLY phone edits (auto-save on blur) -----
  async function onSaveContacts(mobile1?: string, mobile2?: string) {
    if (!voter || isAdmin) return; // admins use header Save

    try {
      const payload: Partial<Voter> = {
        mobile1: (mobile1 ?? voter.mobile1 ?? "").trim() || null,
        mobile2: (mobile2 ?? voter.mobile2 ?? "").trim() || null,
      };
      const r = await fetch(`/api/voters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Update failed");
      }
      toast.success("Contact updated", { description: "Phone number(s) saved." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast.error("Update failed", { description: msg });
    }
  }

  // ----- family tab (load by familyId when opened) -----
  const [famLoading, setFamLoading] = useState(false);
  const [famErr, setFamErr] = useState<string | null>(null);
  const [family, setFamily] = useState<ListRow[]>([]);
  const lastQueryRef = useRef<string>("");

  useEffect(() => {
    if (tab !== "family") return;
    if (!voter?.familyId) {
      setFamily([]);
      return;
    }
    const famId = voter.familyId as string;
    if (lastQueryRef.current === famId) return;
    lastQueryRef.current = famId;

    const ctrl = new AbortController();
    (async () => {
      setFamLoading(true);
      setFamErr(null);
      try {
        const usp = new URLSearchParams({ q: famId, limit: "100" });
        const r = await fetch(`/api/voters?${usp.toString()}`, { cache: "no-store", signal: ctrl.signal });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Failed to load family");

        const raw = Array.isArray(j?.items) ? (j.items as unknown[]) : [];
        const ensured = await Promise.all(
          raw.map(async (row) => {
            const m = row as Record<string, unknown>;
            if (m.familyId) return m;
            const d = await fetch(`/api/voters/${(m as any).id}`, { cache: "no-store", signal: ctrl.signal })
              .then((x) => x.json())
              .catch(() => null);
            return d ? { ...m, familyId: d.familyId } : m;
          })
        );

        const exact: ListRow[] = ensured
          .filter((m) => (m as Record<string, unknown>).familyId === famId && String((m as any).id) !== String(voter.id))
          .map((m) => {
            const mm = m as Record<string, any>;
            return {
              id: String(mm.id),
              name: String(mm.name ?? ""),
              voterId: mm.voterId ?? null,
              village: mm.village ?? null,
              mobile1: mm.mobile1 ?? null,
              colourCode: (mm.colourCode as ColourCode) ?? "OTHER",
            };
          });

        setFamily(exact);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load family";
        if (!ctrl.signal.aborted) {
          setFamErr(msg);
          setFamily([]);
          toast.error("Family load failed", { description: msg });
        }
      } finally {
        if (!ctrl.signal.aborted) setFamLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [tab, voter?.familyId, voter?.id]);

  async function makeHead() {
    if (!voter) return;
    if (!isAdmin) {
      toast.error("Admins only", { description: "You don't have permission to change head." });
      return;
    }
    const payload = {
      familyId: voter.familyId?.trim() || `FAM-${voter.id}`,
      familyIdType: voter.familyIdType || "OTHER",
      relationToHead: "HEAD" as FamilyRole,
      headId: null as unknown as null,
    };
    const r = await fetch(`/api/voters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error("Action failed", { description: j.error || "Could not set head." });
      return;
    }
    await load();
    toast.success("Head updated", { description: `${voter.name} is now marked as Head of Family.` });
  }

  // ----- UI states -----
  if (loading) {
    return (
      <div className="w-full mx-auto p-4 md:p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft size={20} />
          <span>Back to List</span>
        </Link>
        <div className="flex items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#EF3340] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (err || !voter) {
    return (
      <div className="w-full mx-auto p-4 md:p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6">
          <ArrowLeft size={20} />
          <span>Back to List</span>
        </Link>
        <div className="rounded-2xl p-6 text-center bg-rose-50 border border-rose-200/70">
          <div className="text-rose-700 font-semibold">{err || "Voter not found"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full p-4 md:p-6 space-y-6">
      <VoterHeader
        voter={voter}
        family={family}
        tab={tab}
        onEdit={() => (tab === "details" ? setEditDetails(true) : setEditSurvey(true))}
        onSave={() => (tab === "details" ? saveDetails() : saveSurvey())}
        onCancel={() => (tab === "details" ? cancelDetails() : cancelSurvey())}
        saving={saving}
        isEditing={isEditing}
        which={whichEditable}
        canEditAll={isAdmin}
      />

      <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 p-2 bg-slate-50/70 border-b border-slate-200/60">
          {(["details", "family", "survey"] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-white text-[#EF3340] shadow-sm border border-slate-200/60"
                    : "text-slate-700 hover:text-slate-900 hover:bg-white/70"
                }`}
                type="button"
              >
                {t === "details" ? "Details" : t === "family" ? "Family" : "Survey"}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {tab === "details" && (
            <div className="space-y-6">
              <DetailsCard
                voter={voter}
                edit={editDetails && isAdmin}
                setField={setField}
                isAdmin={isAdmin}
                onSaveContacts={onSaveContacts}
              />
              <FamilyEditCard
                voter={voter}
                edit={editDetails && isAdmin}
                setField={setField}
                onMakeHead={makeHead}
              />
            </div>
          )}

          {tab === "family" && (
            <FamilyCard
              voter={voter}
              family={family}
              famLoading={famLoading}
              famErr={famErr}
              onMakeHead={makeHead}
            />
          )}

          {tab === "survey" && (
            <SurveyCard
              voter={voter}
              edit={editSurvey && isAdmin}
              setField={setField}
            />
          )}
        </div>
      </div>
    </div>
  );
}
