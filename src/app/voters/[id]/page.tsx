"use client";

import { useEffect, useRef, useState } from "react";
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

// 🔹 NEW: import the share action bar
import ShareActions from "@/components/voters/ShareActions";

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

export default function VoterPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useMe();

  const [tab, setTab] = useState<Tab>("details");

  // ----- load voter -----
  const [loading, setLoading] = useState(true);
  const [voter, setVoter] = useState<Voter | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/voters/${id}`, { cache: "no-store", signal });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Failed to load");
      const dob = j.dob ? String(j.dob).slice(0, 10) : null;
      setVoter({ ...j, dob });
    } catch (e: any) {
      if (signal?.aborted) return;
      setErr(e?.message || "Failed to load");
      setVoter(null);
      toast.error("Failed to load voter", { description: e?.message || "Please try again." });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [id]);

  // ----- setField wrapper (auto-calc age on dob change) -----
  function setField<K extends keyof Voter>(k: K, v: Voter[K]) {
    setVoter((s) => {
      if (!s) return s;
      if (k === "dob") {
        const nextDob = (v as unknown as string) || "";
        const nextAge = nextDob ? calcAgeFromDOB(nextDob) : null;
        return { ...s, dob: (nextDob || null) as any, age: nextAge };
      }
      return { ...s, [k]: v };
    });
  }

  // ----- edit states (admins only for full edit) -----
  const [editDetails, setEditDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const [editSurvey, setEditSurvey] = useState(false);
  const [savingSurvey, setSavingSurvey] = useState(false);

  // ----- save handlers (admins) -----
  async function saveDetails(e?: React.FormEvent) {
    e?.preventDefault();
    if (!voter || !isAdmin) return;

    setSavingDetails(true);
    try {
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

        // family fields
        familyId: voter.familyId?.trim() || null,
        familyIdType: voter.familyIdType || null,
        relationToHead: voter.relationToHead || null,
        headId: voter.relationToHead === "HEAD" ? null : voter.headId || null,
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
    } catch (e: any) {
      toast.error("Save failed", { description: e?.message || "Please try again." });
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
    } catch (e: any) {
      toast.error("Save failed", { description: e?.message || "Please try again." });
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
    } catch (e: any) {
      toast.error("Update failed", { description: e?.message || "Please try again." });
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
    const famId = voter.familyId;
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

        const raw: any[] = Array.isArray(j?.items) ? j.items : [];
        const ensured = await Promise.all(
          raw.map(async (row) => {
            if (row.familyId) return row;
            const d = await fetch(`/api/voters/${row.id}`, { cache: "no-store", signal: ctrl.signal })
              .then((x) => x.json())
              .catch(() => null);
            return d ? { ...row, familyId: d.familyId } : row;
          })
        );

        const exact = ensured
          .filter((m) => m.familyId === famId && String(m.id) !== String(voter.id))
          .map((m) => ({
            id: String(m.id),
            name: String(m.name ?? ""),
            voterId: m.voterId ?? null,
            village: m.village ?? null,
            mobile1: m.mobile1 ?? null,
            colourCode: (m.colourCode as ColourCode) ?? "OTHER",
          })) as ListRow[];

        setFamily(exact);
      } catch (e: any) {
        if (!ctrl.signal.aborted) {
          setFamErr(e?.message || "Failed to load family");
          setFamily([]);
          toast.error("Family load failed", { description: e?.message || "Please try again." });
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
      headId: null as any,
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
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft size={20} />
          <span>Back to List</span>
        </Link>
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-[#EF3340] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (err || !voter) {
    return (
      <div className="w-full mx-auto p-4 md:p-6">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft size={20} />
          <span>Back to List</span>
        </Link>
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
          <div className="text-red-600 font-medium">{err || "Voter not found"}</div>
        </div>
      </div>
    );
  }

  const whichEditable: "details" | "survey" = tab === "details" ? "details" : "survey";
  const isEditing = tab === "details" ? editDetails : tab === "survey" ? editSurvey : false;
  const saving = tab === "details" ? savingDetails : savingSurvey;

  return (
    <div className="mx-auto w-full p-4 md:p-6 space-y-6">
      <VoterHeader
        voter={voter}
        family={family}            // 🔹 NEW
        tab={tab}
        onEdit={() => (tab === "details" ? setEditDetails(true) : setEditSurvey(true))}
        onSave={() => (tab === "details" ? saveDetails() : saveSurvey())}
        onCancel={() => (tab === "details" ? cancelDetails() : cancelSurvey())}
        saving={saving}
        isEditing={isEditing}
        which={whichEditable}
        canEditAll={isAdmin}
      />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border-b border-slate-200">
          {(["details", "family", "survey"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t ? "bg-white text-[#EF3340] shadow border border-slate-200" : "text-slate-700 hover:text-slate-900 hover:bg-white/60"
                }`}
            >
              {t === "details" ? "Details" : t === "family" ? "Family" : "Survey"}
            </button>
          ))}
        </div>

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
              <FamilyEditCard voter={voter} edit={editDetails && isAdmin} setField={setField} onMakeHead={makeHead} />
            </div>
          )}

          {tab === "family" && (
            <FamilyCard voter={voter} family={family} famLoading={famLoading} famErr={famErr} onMakeHead={makeHead} />
          )}

          {tab === "survey" && <SurveyCard voter={voter} edit={editSurvey && isAdmin} setField={setField} />}
        </div>
      </div>
    </div>
  );
}
