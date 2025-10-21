// src/lib/share.ts
import type { Voter, ListRow } from "@/types/voter";

export function buildShareText(v: Voter, family?: ListRow[]) {
  const out: string[] = [];

  // ——— HEADER
  out.push(`=== VOTER DETAILS ===`);
  out.push(`Name: ${v.name}`);
  if (v.voterId) out.push(`Voter ID: ${v.voterId}`);
  if (v.age != null) out.push(`Age: ${v.age}`);
  if (v.gender) out.push(`Gender: ${v.gender}`);
  if (v.dob) out.push(`DOB: ${v.dob}`);
  if (v.village) out.push(`Village: ${v.village}`);
  if (v.houseNo) out.push(`House No: ${v.houseNo}`);
  if (v.address) out.push(`Address: ${v.address}`);
  if (v.boothName) out.push(`Booth: ${v.boothName}`);
  if (v.boothNo != null) out.push(`Booth No: ${v.boothNo}`);
  if (v.partNo != null) out.push(`Part No: ${v.partNo}`);
  if (v.srn != null) out.push(`SRN: ${v.srn}`);
  if (v.mobile1) out.push(`Mobile 1: ${v.mobile1}`);
  if (v.mobile2) out.push(`Mobile 2: ${v.mobile2}`);
  if (v.email) out.push(`Email: ${v.email}`);
  out.push(`Colour: ${v.colourCode}`);
  out.push(`Voted: ${v.voted ? "Yes" : "No"}`);
  if (v.starVoter) out.push(`Star Voter: Yes`);
  if (v.dead) out.push(`Deceased: Yes`);

  // NEW fields
  // (Cast to any so this file stays decoupled from Prisma types)
  const anyV = v as any;
  if (anyV.fatherName) out.push(`Father's Name: ${anyV.fatherName}`);
  if (anyV.partySupport) out.push(`Party Support: ${anyV.partySupport}`);
  if (anyV.wardNo != null) out.push(`Ward No: ${anyV.wardNo}`);

  // ——— SURVEY
  const surveyLines: string[] = [];
  if (v.caste) surveyLines.push(`Caste: ${v.caste}`);
  if (v.profession) surveyLines.push(`Profession: ${v.profession}`);
  if (v.demands) surveyLines.push(`Demands: ${v.demands}`);
  if (v.extraInfo) surveyLines.push(`Notes: ${v.extraInfo}`);
  if (surveyLines.length) {
    out.push("");
    out.push(`=== SURVEY ===`);
    out.push(...surveyLines);
  }

  // ——— FAMILY META
  const famMeta: string[] = [];
  if (v.familyId) famMeta.push(`Family ID: ${v.familyId}`);
  if (anyV.familyIdType) famMeta.push(`Family ID Type: ${anyV.familyIdType}`);
  if (v.relationToHead) famMeta.push(`Role: ${v.relationToHead}`);
  if ((v as any).head?.name || v.headId) famMeta.push(`Head: ${(v as any).head?.name || v.headId}`);
  if (famMeta.length) {
    out.push("");
    out.push(`=== FAMILY ===`);
    out.push(...famMeta);
  }

  // ——— FAMILY MEMBERS
  if (family?.length) {
    out.push(`Members (${family.length}):`);
    family.forEach((m, i) => {
      const parts = [
        `${i + 1}. ${m.name}`,
        m.village ? `(${m.village})` : "",
        m.mobile1 ? `• ${m.mobile1}` : "",
        m.voterId ? `• ${m.voterId}` : "",
      ].filter(Boolean);
      out.push(parts.join(" "));
    });
  }

  return out.join("\n");
}
