// src/app/voters/[id]/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Edit2, Save, X, CheckCircle, Phone, FileText,
  MapPin, Home, Users, ExternalLink, Crown, IdCard
} from "lucide-react";

type Gender = "M" | "F" | "O";
type ColourCode = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";
type FamilyRole = "HEAD" | "SPOUSE" | "CHILD" | "PARENT" | "SIBLING" | "OTHER";
type FamilyIdType = "JAN_AADHAAR_FAMILY_ID" | "RATION_CARD_NO" | "OTHER";

type Voter = {
  id: string;
  name: string;
  voterId: string | null;
  age: number | null;
  gender: Gender | null;
  village: string | null;
  houseNo: string | null;
  address: string | null;
  boothName: string | null;
  boothNo: number | null;
  partNo: number | null;
  srn: number | null;
  mobile1: string | null;
  mobile2: string | null;
  email: string | null;
  colourCode: ColourCode;
  voted: boolean;
  starVoter: boolean;
  dead: boolean;

  // survey
  caste: string | null;
  profession: string | null;
  demands: string | null;
  extraInfo: string | null;
  dob: string | null;

  // family (head-based)
  familyId: string | null;
  familyIdType: FamilyIdType | null;
  relationToHead: FamilyRole | null;
  headId: string | null;
  head?: { id: string; name: string } | null;

  // optional preview from API
  familyPreview?: Array<{ id: string; name: string }>;
};

type ListRow = {
  id: string;
  name: string;
  voterId: string | null;
  village: string | null;
  mobile1: string | null;
  colourCode: ColourCode;
};

export default function VoterPage() {
  const { id } = useParams<{ id: string }>();

  const [tab, setTab] = useState<"details" | "family" | "survey">("details");

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
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [id]);

  function setField<K extends keyof Voter>(k: K, v: Voter[K]) {
    setVoter((s) => (s ? { ...s, [k]: v } : s));
  }

  // DETAILS EDIT
  const [editDetails, setEditDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [msgDetails, setMsgDetails] = useState<string | null>(null);

  async function saveDetails(e?: React.FormEvent) {
    e?.preventDefault();
    if (!voter) return;
    setSavingDetails(true);
    setMsgDetails(null);
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

        // family
        familyId: voter.familyId?.trim() || null,
        familyIdType: voter.familyIdType || null,
        relationToHead: voter.relationToHead || null,
        headId: voter.relationToHead === "HEAD" ? null : (voter.headId || null),
      };

      const r = await fetch(`/api/voters/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Save failed");
      setMsgDetails("✓ Saved successfully");
      setEditDetails(false);
      await load();
    } catch (e: any) {
      setMsgDetails(e?.message || "Save failed");
    } finally {
      setSavingDetails(false);
      setTimeout(() => setMsgDetails(null), 3000);
    }
  }

  function cancelDetails() {
    setEditDetails(false);
    load();
  }

  // SURVEY EDIT
  const [editSurvey, setEditSurvey] = useState(false);
  const [savingSurvey, setSavingSurvey] = useState(false);
  const [msgSurvey, setMsgSurvey] = useState<string | null>(null);

  async function saveSurvey(e?: React.FormEvent) {
    e?.preventDefault();
    if (!voter) return;
    setSavingSurvey(true);
    setMsgSurvey(null);
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
      setMsgSurvey("✓ Saved successfully");
      setEditSurvey(false);
      await load();
    } catch (e: any) {
      setMsgSurvey(e?.message || "Save failed");
    } finally {
      setSavingSurvey(false);
      setTimeout(() => setMsgSurvey(null), 3000);
    }
  }

  function cancelSurvey() {
    setEditSurvey(false);
    load();
  }

  // ===== FAMILY (dynamic via familyId) =====
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
    // prevent duplicate fetches if same famId re-renders
    if (lastQueryRef.current === famId) return;
    lastQueryRef.current = famId;

    const ctrl = new AbortController();
    (async () => {
      setFamLoading(true);
      setFamErr(null);
      try {
        // Use list endpoint (supports search by familyId). Then client-filter for exact same familyId.
        const usp = new URLSearchParams({
          q: famId,
          limit: "100",
        });
        const r = await fetch(`/api/voters?${usp.toString()}`, { cache: "no-store", signal: ctrl.signal });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Failed to load family");

        const raw: any[] = Array.isArray(j?.items) ? j.items : [];
        // We still need each row's familyId to filter exact. If not present in list row, refetch each id (safe small N).
        // Try fast path: if rows already contain familyId (in your schema, they don't by default), filter here.
        // Fallback: hydrate minimal details by GET /api/voters/[id] for accuracy.
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
        }
      } finally {
        if (!ctrl.signal.aborted) setFamLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [tab, voter?.familyId, voter?.id]);

  // Helpers
  const getColorBadge = (code: ColourCode) => {
    const styles = {
      OUR: "bg-green-100 text-green-700 border-green-200",
      OPPOSITE: "bg-red-100 text-red-700 border-red-200",
      DOUBTFUL: "bg-yellow-100 text-yellow-700 border-yellow-200",
      OTHER: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return styles[code] || styles.OTHER;
  };

  async function makeHead() {
    if (!voter) return;
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
      alert(j.error || "Failed to set head");
      return;
    }
    await load();
  }

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

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
      `}</style>

      <div className="w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-2">
              <ArrowLeft size={16} />
              <span>Back to List</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{voter.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <span>ID: {voter.voterId || "—"}</span>
              <span>•</span>
              <span>{voter.village || "No village"}</span>
              {voter.age != null && (
                <>
                  <span>•</span>
                  <span>{voter.age} years</span>
                </>
              )}
              {/* Family quick glance */}
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <IdCard size={14} className="text-gray-400" /> Family: {voter.familyId || "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Crown size={14} className={`${voter.relationToHead === "HEAD" ? "text-amber-500" : "text-gray-400"}`} />
                Role: {voter.relationToHead || "—"}
              </span>
              {voter.headId && voter.relationToHead !== "HEAD" && (
                <Link
                  href={`/voters/${voter.headId}`}
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                >
                  <Crown size={14} /> Head: {voter.head?.name || voter.headId}
                </Link>
              )}
            </div>
          </div>

          {/* Top-right action bar */}
          <div className="flex items-center gap-2">
            {/* status chips */}
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${getColorBadge(voter.colourCode)}`}>
              {voter.colourCode}
            </span>
            {voter.voted && (
              <div className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 border border-green-200 flex items-center gap-1.5 text-sm font-medium">
                <CheckCircle size={16} />
                <span>Voted</span>
              </div>
            )}
            {voter.dead && (
              <div className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 text-sm font-medium">
                Deceased
              </div>
            )}

            {tab === "details" && (
              <>
                {!editDetails ? (
                  <button
                    type="button"
                    onClick={() => setEditDetails(true)}
                    className="ml-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    <Edit2 size={16} />
                    <span>Edit Details</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => saveDetails()}
                      disabled={savingDetails}
                      className="ml-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      <Save size={16} />
                      <span>{savingDetails ? "Saving..." : "Save"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={cancelDetails}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </>
                )}
              </>
            )}

            {tab === "survey" && (
              <>
                {!editSurvey ? (
                  <button
                    type="button"
                    onClick={() => setEditSurvey(true)}
                    className="ml-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  >
                    <Edit2 size={16} />
                    <span>Edit Survey</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => saveSurvey()}
                      disabled={savingSurvey}
                      className="ml-2 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      <Save size={16} />
                      <span>{savingSurvey ? "Saving..." : "Save"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={cancelSurvey}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* inline save status messages */}
        {msgDetails && tab === "details" && (
          <div className={`text-sm font-medium ${msgDetails.includes("✓") ? "text-green-600" : "text-red-600"}`}>
            {msgDetails}
          </div>
        )}
        {msgSurvey && tab === "survey" && (
          <div className={`text-sm font-medium ${msgSurvey.includes("✓") ? "text-green-600" : "text-red-600"}`}>
            {msgSurvey}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-1 flex gap-1">
          {(["details", "family", "survey"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${
                tab === t
                  ? "bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t === "details" ? "Voter Details" : t === "family" ? "Family" : "Survey Data"}
            </button>
          ))}
        </div>

        {/* DETAILS TAB */}
        {tab === "details" && (
          <div className="space-y-6 fade-in">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Home size={20} className="text-gray-400" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    required
                    value={voter.name}
                    disabled={!editDetails}
                    onChange={(e) => setField("name", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voter ID</label>
                  <input
                    value={voter.voterId || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("voterId", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    value={voter.age ?? ""}
                    disabled={!editDetails}
                    inputMode="numeric"
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, "");
                      setField("age", onlyDigits ? Number(onlyDigits) : null);
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                  <select
                    value={voter.gender || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("gender", (e.target.value || null) as any)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  >
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={voter.dob || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("dob", e.target.value || null)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin size={20} className="text-gray-400" />
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Village</label>
                  <input
                    value={voter.village || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("village", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">House No.</label>
                  <input
                    value={voter.houseNo || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("houseNo", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    value={voter.address || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("address", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Booth Info */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <IdCard size={20} className="text-gray-400" />
                Booth Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Booth Name</label>
                  <input
                    value={voter.boothName || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("boothName", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Booth No.</label>
                  <input
                    value={voter.boothNo ?? ""}
                    disabled={!editDetails}
                    inputMode="numeric"
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, "");
                      setField("boothNo", onlyDigits ? Number(onlyDigits) : null);
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Part No.</label>
                  <input
                    value={voter.partNo ?? ""}
                    disabled={!editDetails}
                    inputMode="numeric"
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, "");
                      setField("partNo", onlyDigits ? Number(onlyDigits) : null);
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SRN</label>
                  <input
                    value={voter.srn ?? ""}
                    disabled={!editDetails}
                    inputMode="numeric"
                    onChange={(e) => {
                      const onlyDigits = e.target.value.replace(/\D/g, "");
                      setField("srn", onlyDigits ? Number(onlyDigits) : null);
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Phone size={20} className="text-gray-400" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile 1</label>
                  <input
                    value={voter.mobile1 || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("mobile1", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile 2</label>
                  <input
                    value={voter.mobile2 || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("mobile2", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    value={voter.email || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("email", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-gray-400" />
                Classification & Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Voter's Side</label>
                  <select
                    value={voter.colourCode}
                    disabled={!editDetails}
                    onChange={(e) => setField("colourCode", e.target.value as ColourCode)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  >
                    <option value="OUR">Our</option>
                    <option value="OPPOSITE">Opposite</option>
                    <option value="DOUBTFUL">Doubtful</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="flex items-end gap-4 pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!voter.voted}
                      disabled={!editDetails}
                      onChange={(e) => setField("voted", e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]"
                    />
                    <span className="text-sm font-medium text-gray-700">Voted</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!voter.starVoter}
                      disabled={!editDetails}
                      onChange={(e) => setField("starVoter", e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]"
                    />
                    <span className="text-sm font-medium text-gray-700">Star Voter</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!voter.dead}
                      disabled={!editDetails}
                      onChange={(e) => setField("dead", e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]"
                    />
                    <span className="text-sm font-medium text-gray-700">Deceased</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Family (head-based) */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-gray-400" />
                Family (Head-based)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Family ID</label>
                  <input
                    value={voter.familyId || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("familyId", e.target.value)}
                    placeholder="e.g., Jan Aadhaar Family ID / Ration No."
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Family ID Type</label>
                  <select
                    value={voter.familyIdType || ""}
                    disabled={!editDetails}
                    onChange={(e) => setField("familyIdType", (e.target.value || null) as FamilyIdType | null)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  >
                    <option value="">Select</option>
                    <option value="JAN_AADHAAR_FAMILY_ID">Jan Aadhaar Family Id</option>
                    <option value="RATION_CARD_NO">Ration Card No</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role (relative to Head)</label>
                  <select
                    value={voter.relationToHead || ""}
                    disabled={!editDetails}
                    onChange={(e) => {
                      const v = (e.target.value || null) as FamilyRole | null;
                      setField("relationToHead", v);
                      if (v === "HEAD") setField("headId", null);
                    }}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  >
                    <option value="">Select</option>
                    <option value="HEAD">Head</option>
                    <option value="SPOUSE">Spouse</option>
                    <option value="CHILD">Child</option>
                    <option value="PARENT">Parent</option>
                    <option value="SIBLING">Sibling</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="flex items-end">
                  {voter.relationToHead !== "HEAD" ? (
                    <button
                      type="button"
                      onClick={makeHead}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                      <Crown size={18} />
                      <span>Make this person Head</span>
                    </button>
                  ) : (
                    <div className="w-full px-4 py-2.5 border-2 border-green-300 bg-green-50 rounded-xl text-green-700 font-medium flex items-center gap-2">
                      <Crown size={18} /> This person is the Head
                    </div>
                  )}
                </div>
              </div>

              {voter.relationToHead !== "HEAD" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Head Voter ID (numeric)</label>
                    <input
                      value={voter.headId || ""}
                      disabled={!editDetails}
                      inputMode="numeric"
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/\D/g, "");
                        setField("headId", onlyDigits || null);
                      }}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                    />
                  </div>
                  {voter.headId && (
                    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown size={16} />
                        <span>Current Head:</span>
                        <Link href={`/voters/${voter.headId}`} className="font-semibold hover:underline">
                          {voter.head?.name || voter.headId}
                        </Link>
                      </div>
                      <Link
                        href={`/voters/${voter.headId}`}
                        className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                      >
                        View <ExternalLink size={14} />
                      </Link>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500">Tip: If you set role as <b>HEAD</b>, leave “Head Voter ID” blank.</p>
            </div>
          </div>
        )}

        {/* FAMILY TAB */}
        {tab === "family" && (
          <div className="space-y-6 fade-in">
            {/* context banner */}
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 flex flex-wrap gap-4">
              <span className="inline-flex items-center gap-1"><IdCard size={14} /> Family: <b>{voter.familyId || "—"}</b></span>
              <span className="inline-flex items-center gap-1"><Crown size={14} className={voter.relationToHead === "HEAD" ? "text-amber-500" : ""} /> Role: <b>{voter.relationToHead || "—"}</b></span>
              {voter.headId && voter.relationToHead !== "HEAD" && (
                <span className="inline-flex items-center gap-1">
                  <Crown size={14} />
                  Head: <Link href={`/voters/${voter.headId}`} className="text-blue-700 hover:underline">{voter.head?.name || voter.headId}</Link>
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b-2 border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={20} className="text-gray-400" />
                  Family Members
                </h3>
              </div>

              {famLoading ? (
                <div className="p-12 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#EF3340] rounded-full animate-spin" />
                  <p className="mt-4 text-gray-600">Loading family members...</p>
                </div>
              ) : famErr ? (
                <div className="p-6 text-center text-red-600">{famErr}</div>
              ) : !voter.familyId ? (
                <div className="p-12 text-center">
                  <p className="text-gray-600 font-medium">This voter has no Family ID set.</p>
                  <p className="text-sm text-gray-500 mt-1">Set a <b>Family ID</b> in Details → Family (Head-based) to link members automatically.</p>
                </div>
              ) : family.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-600 font-medium">No other members found for this Family ID.</p>
                  <p className="text-sm text-gray-500 mt-1">Ensure other profiles share the exact same <b>Family ID</b>.</p>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {family.map((m) => {
                    const initials = (m.name || "—")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s) => s[0]?.toUpperCase())
                      .join("");
                    return (
                      <Link
                        key={m.id}
                        href={`/voters/${m.id}`}
                        className="group relative rounded-2xl border-2 border-gray-200 hover:border-[#EF3340]/40 transition-all bg-white overflow-hidden"
                      >
                        {/* gradient ribbon */}
                        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-[#EF3340]/10 to-[#C82333]/10 pointer-events-none" />
                        <div className="p-5 flex items-start gap-4">
                          <div className="shrink-0 w-12 h-12 rounded-2xl bg-gray-100 border border-gray-200 grid place-items-center text-gray-700 font-semibold">
                            {initials || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-semibold text-gray-900 truncate">{m.name}</h4>
                              {m.colourCode !== "OTHER" && (
                                <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${getColorBadge(m.colourCode)}`}>
                                  {m.colourCode}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-gray-600 truncate">
                              {m.village || "—"} {m.mobile1 ? <>• {m.mobile1}</> : null}
                            </div>
                            {m.voterId && (
                              <div className="mt-0.5 text-xs text-gray-500">ID: {m.voterId}</div>
                            )}
                          </div>
                          <ExternalLink className="text-gray-400 group-hover:text-[#EF3340] transition-colors" size={18} />
                        </div>
                        {/* hover underline */}
                        <div className="px-5 pb-4">
                          <span className="inline-block text-sm text-[#EF3340] opacity-0 group-hover:opacity-100 transition-opacity">
                            View details →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SURVEY TAB */}
        {tab === "survey" && (
          <div className="space-y-6 fade-in">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={20} className="text-gray-400" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caste</label>
                  <input
                    value={voter.caste || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("caste", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profession</label>
                  <input
                    value={voter.profession || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("profession", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Demands</label>
                  <input
                    value={voter.demands || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("demands", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extra Info / Notes</label>
                  <textarea
                    value={voter.extraInfo || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("extraInfo", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
