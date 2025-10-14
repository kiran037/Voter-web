// src/app/voters/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Edit2, Save, X, CheckCircle, Phone, Mail, MapPin,
  Home, Building, Users, FileText, Plus, Search, Trash2, ExternalLink
} from "lucide-react";

type Gender = "M" | "F" | "O";
type ColourCode = "OUR" | "OPPOSITE" | "DOUBTFUL" | "OTHER";
type KinRelation = "SPOUSE" | "CHILD" | "PARENT" | "SIBLING" | "OTHER";

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

  caste: string | null;
  profession: string | null;
  personnel: string | null;
  society: string | null;
  flatNo: string | null;
  newAddress: string | null;
  demands: string | null;
  extraInfo1: string | null;
  extraInfo2: string | null;
  extraInfo3: string | null;
  extraInfo4: string | null;
  extraInfo5: string | null;
  extraCheck1: boolean | null;
  extraCheck2: boolean | null;
  dob: string | null;
};

type FamilyLink = {
  linkId: string;
  relation: KinRelation;
  notes: string | null;
  relative: { id: string; name: string; village: string | null; mobile1: string | null };
};
type SearchRow = {
  id: string;
  name: string;
  village: string | null;
  mobile1: string | null;
  voterId: string | null;
  colourCode: ColourCode;
};

export default function VoterPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tab, setTab] = useState<"details" | "family" | "survey">("details");

  const [loading, setLoading] = useState(true);
  const [voter, setVoter] = useState<Voter | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/voters/${id}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Failed to load");
      const dob = j.dob ? String(j.dob).slice(0, 10) : null;
      setVoter({ ...j, dob });
    } catch (e: any) {
      setErr(e?.message || "Failed to load");
      setVoter(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [id]);

  function setField<K extends keyof Voter>(k: K, v: Voter[K]) {
    setVoter((s) => (s ? { ...s, [k]: v } : s));
  }

  // DETAILS EDITING
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

  // SURVEY EDITING
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
        personnel: voter.personnel?.trim() || null,
        society: voter.society?.trim() || null,
        flatNo: voter.flatNo?.trim() || null,
        newAddress: voter.newAddress?.trim() || null,
        demands: voter.demands?.trim() || null,
        extraInfo1: voter.extraInfo1?.trim() || null,
        extraInfo2: voter.extraInfo2?.trim() || null,
        extraInfo3: voter.extraInfo3?.trim() || null,
        extraInfo4: voter.extraInfo4?.trim() || null,
        extraInfo5: voter.extraInfo5?.trim() || null,
        extraCheck1: voter.extraCheck1 ?? null,
        extraCheck2: voter.extraCheck2 ?? null,
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

  // FAMILY
  const [famLoading, setFamLoading] = useState(false);
  const [family, setFamily] = useState<FamilyLink[]>([]);
  const [famErr, setFamErr] = useState<string | null>(null);
  async function loadFamily() {
    setFamLoading(true);
    setFamErr(null);
    try {
      const r = await fetch(`/api/voters/${id}/family`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Failed to load family");
      setFamily(j.items || []);
    } catch (e: any) {
      setFamErr(e?.message || "Failed to load family");
      setFamily([]);
    } finally {
      setFamLoading(false);
    }
  }
  useEffect(() => {
    if (tab === "family") loadFamily();
  }, [tab, id]);

  const [relSearch, setRelSearch] = useState("");
  const [relResults, setRelResults] = useState<SearchRow[]>([]);
  const [relSearching, setRelSearching] = useState(false);
  const [relation, setRelation] = useState<KinRelation>("OTHER");
  const [relNotes, setRelNotes] = useState("");
  const [selectedRelative, setSelectedRelative] = useState<SearchRow | null>(null);
  const [relErr, setRelErr] = useState<string | null>(null);
  const [addingLink, setAddingLink] = useState(false);

  const debRef = useRef<number | null>(null);
  useEffect(() => {
    if (!relSearch.trim()) {
      setRelResults([]);
      setSelectedRelative(null);
      return;
    }
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(async () => {
      setRelSearching(true);
      setRelErr(null);
      try {
        const usp = new URLSearchParams({ q: relSearch.trim(), limit: "10" });
        const r = await fetch(`/api/voters/search?${usp.toString()}`, { cache: "no-store" });
        const j = await r.json().catch(() => []);
        setRelResults(Array.isArray(j) ? j : []);
      } catch (e: any) {
        setRelErr(e?.message || "Search failed");
      } finally {
        setRelSearching(false);
      }
    }, 300);
    return () => { if (debRef.current) window.clearTimeout(debRef.current); };
  }, [relSearch]);

  async function addFamilyLink() {
    if (!selectedRelative) return setRelErr("Select a person from search results");
    if (selectedRelative.id === id) return setRelErr("Cannot link to self");

    setAddingLink(true);
    setRelErr(null);
    try {
      const r = await fetch(`/api/voters/${id}/family`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relativeId: selectedRelative.id,
          relation,
          notes: relNotes.trim() || null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Failed to add");
      setRelSearch("");
      setRelResults([]);
      setSelectedRelative(null);
      setRelation("OTHER");
      setRelNotes("");
      await loadFamily();
    } catch (e: any) {
      setRelErr(e?.message || "Failed to add");
    } finally {
      setAddingLink(false);
    }
  }

  async function removeFamilyLink(linkId: string) {
    try {
      const r = await fetch(`/api/voters/${id}/family`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
      if (r.ok) await loadFamily();
    } catch {}
  }

  const getColorBadge = (code: ColourCode) => {
    const styles = {
      OUR: "bg-green-100 text-green-700 border-green-200",
      OPPOSITE: "bg-red-100 text-red-700 border-red-200",
      DOUBTFUL: "bg-yellow-100 text-yellow-700 border-yellow-200",
      OTHER: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return styles[code] || styles.OTHER;
  };

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
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>ID: {voter.voterId || "—"}</span>
              <span>•</span>
              <span>{voter.village || "No village"}</span>
              {voter.age && (
                <>
                  <span>•</span>
                  <span>{voter.age} years</span>
                </>
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

            {/* edit/save/cancel depending on tab */}
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
              {t === "details" ? "Voter Details" : t === "family" ? "Family Links" : "Survey Data"}
            </button>
          ))}
        </div>

        {/* DETAILS TAB (no form submit) */}
        {tab === "details" && (
          <div className="space-y-6 fade-in">
            {/* Basic Info */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building size={20} className="text-gray-400" />
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
                    onChange={(e) => setField("age", Number(e.target.value.replace(/\D/g, "")) || null)}
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
                <Home size={20} className="text-gray-400" />
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
                    onChange={(e) => setField("boothNo", Number(e.target.value.replace(/\D/g, "")) || null)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Part No.</label>
                  <input
                    value={voter.partNo ?? ""}
                    disabled={!editDetails}
                    inputMode="numeric"
                    onChange={(e) => setField("partNo", Number(e.target.value.replace(/\D/g, "")) || null)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SRN</label>
                  <input
                    value={voter.srn ?? ""}
                    disabled={!editDetails}
                    inputMode="numeric"
                    onChange={(e) => setField("srn", Number(e.target.value.replace(/\D/g, "")) || null)}
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
          </div>
        )}

        {/* FAMILY TAB */}
        {tab === "family" && (
          <div className="space-y-6 fade-in">
            {/* Add Family Member */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus size={20} className="text-gray-400" />
                Add Family Member
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-6 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      value={relSearch}
                      onChange={(e) => setRelSearch(e.target.value)}
                      placeholder="Search by name, village, voter ID, phone..."
                      className="w-full pl-11 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none transition-colors"
                    />
                  </div>

                  {relSearching && (
                    <div className="text-sm text-gray-500">Searching...</div>
                  )}

                  {relResults.length > 0 && (
                    <div className="border-2 border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                      {relResults.map((r) => (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b last:border-b-0 ${
                            selectedRelative?.id === r.id ? "bg-blue-50" : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-900">{r.name}</div>
                            <div className="text-xs text-gray-500 truncate">
                              {r.voterId && `ID: ${r.voterId} • `}
                              {r.village || "—"}
                              {r.mobile1 && ` • ${r.mobile1}`}
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedRelative(r)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              selectedRelative?.id === r.id
                                ? "bg-[#EF3340] text-white"
                                : "border-2 border-gray-200 hover:border-[#EF3340]/50"
                            }`}
                          >
                            {selectedRelative?.id === r.id ? "Selected" : "Select"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                  <select
                    value={relation}
                    onChange={(e) => setRelation(e.target.value as KinRelation)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none transition-colors"
                  >
                    <option value="SPOUSE">Spouse</option>
                    <option value="CHILD">Child</option>
                    <option value="PARENT">Parent</option>
                    <option value="SIBLING">Sibling</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <input
                    value={relNotes}
                    onChange={(e) => setRelNotes(e.target.value)}
                    placeholder="Additional notes"
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {selectedRelative && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="text-sm text-blue-800">
                    Selected: <span className="font-semibold">{selectedRelative.name}</span>
                  </div>
                  <button
                    onClick={() => setSelectedRelative(null)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {relErr && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {relErr}
                </div>
              )}

              <button
                onClick={addFamilyLink}
                disabled={addingLink || !selectedRelative}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#EF3340] to-[#C82333] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
              >
                <Plus size={18} />
                <span>{addingLink ? "Adding..." : "Add Family Link"}</span>
              </button>
            </div>

            {/* Family List */}
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
              ) : family.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-600 font-medium">No family members linked</p>
                  <p className="text-sm text-gray-500 mt-1">Use the search above to add family connections</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {family.map((l) => (
                    <div key={l.linkId} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-gray-900">{l.relative.name}</div>
                            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                              {l.relation}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {l.relative.village || "—"}
                            {l.relative.mobile1 && ` • ${l.relative.mobile1}`}
                            {l.notes && ` • ${l.notes}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/voters/${l.relative.id}`}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title="View Details"
                          >
                            <ExternalLink size={18} className="text-gray-600" />
                          </Link>
                          <button
                            onClick={() => removeFamilyLink(l.linkId)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Remove Link"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SURVEY TAB (no form submit) */}
        {tab === "survey" && (
          <div className="space-y-6 fade-in">
            {/* Survey Fields */}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Personnel</label>
                  <input
                    value={voter.personnel || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("personnel", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Society</label>
                  <input
                    value={voter.society || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("society", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Flat No.</label>
                  <input
                    value={voter.flatNo || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("flatNo", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Address</label>
                  <input
                    value={voter.newAddress || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("newAddress", e.target.value)}
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
              </div>
            </div>

            {/* Extra Fields */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Additional Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extra Info 1</label>
                  <input
                    value={voter.extraInfo1 || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("extraInfo1", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extra Info 2</label>
                  <input
                    value={voter.extraInfo2 || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("extraInfo2", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extra Info 3</label>
                  <input
                    value={voter.extraInfo3 || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("extraInfo3", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extra Info 4</label>
                  <input
                    value={voter.extraInfo4 || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("extraInfo4", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extra Info 5</label>
                  <input
                    value={voter.extraInfo5 || ""}
                    disabled={!editSurvey}
                    onChange={(e) => setField("extraInfo5", e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#EF3340] focus:outline-none disabled:bg-gray-50 disabled:text-gray-600 transition-colors"
                  />
                </div>
                <div className="md:col-span-2 flex gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!voter.extraCheck1}
                      disabled={!editSurvey}
                      onChange={(e) => setField("extraCheck1", e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]"
                    />
                    <span className="text-sm font-medium text-gray-700">Extra Check 1</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!voter.extraCheck2}
                      disabled={!editSurvey}
                      onChange={(e) => setField("extraCheck2", e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-[#EF3340] focus:ring-[#EF3340]"
                    />
                    <span className="text-sm font-medium text-gray-700">Extra Check 2</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
