// src/lib/family.ts
import { prisma } from "@/lib/prisma";

/**
 * With the new schema, "family" is defined by a shared Voter.familyId (string).
 * This helper:
 *  - Finds members sharing the same familyId.
 *  - Picks the first voter marked as relationToHead === "HEAD" (if any) as the head.
 *  - Normalizes head links:
 *      * Ensures head.headId = null
 *      * Ensures every non-head member has headId = head.id
 *      * If a non-head is incorrectly marked HEAD, demote to OTHER (so only one HEAD remains)
 *
 * NOTE: There is intentionally NO kin-edge table anymore.
 *       Family pages should list members by same familyId.
 */
export async function rebuildFamilyGraph(familyId: string) {
  if (!familyId) return;

  const members = await prisma.voter.findMany({
    where: { familyId },
    select: { id: true, relationToHead: true, headId: true },
    orderBy: { id: "asc" },
  });

  if (members.length === 0) return;

  // Choose the first declared HEAD (if multiple, we'll keep the earliest and demote others)
  const declaredHeads = members.filter(m => m.relationToHead === "HEAD");
  const head = declaredHeads[0] ?? null;
  if (!head) {
    // No head set; nothing to normalize (familyId still groups them together)
    return;
  }

  const tx: any[] = [];

  // Ensure the chosen head points to nobody
  if (head.headId !== null) {
    tx.push(prisma.voter.update({ where: { id: head.id }, data: { headId: null } }));
  }

  for (const m of members) {
    if (m.id === head.id) continue;

    // Make sure every member has headId pointing to the chosen head
    if (m.headId !== head.id) {
      tx.push(prisma.voter.update({ where: { id: m.id }, data: { headId: head.id } }));
    }

    // If any other member is marked HEAD, demote to OTHER to keep a single HEAD
    if (m.relationToHead === "HEAD") {
      tx.push(prisma.voter.update({ where: { id: m.id }, data: { relationToHead: "OTHER" as any } }));
    }
  }

  if (tx.length > 0) {
    await prisma.$transaction(tx);
  }
}

/**
 * Convenience fetcher for a voter's family group (same familyId).
 * Returns the head (if present) and an ordered list of members.
 */
export async function getFamilyByVoterId(voterId: bigint) {
  const me = await prisma.voter.findUnique({
    where: { id: voterId },
    select: { id: true, name: true, familyId: true, relationToHead: true, headId: true },
  });
  if (!me?.familyId) {
    return { familyId: null, head: null, members: [] as { id: bigint; name: string | null; relationToHead: string | null; headId: bigint | null }[] };
  }

  const members = await prisma.voter.findMany({
    where: { familyId: me.familyId },
    select: { id: true, name: true, relationToHead: true, headId: true },
    orderBy: [{ relationToHead: "asc" }, { id: "asc" }],
  });

  // Find current head (prefer explicit HEAD, otherwise anyone whose id matches others' headId)
  const head =
    members.find(m => m.relationToHead === "HEAD") ??
    (members.length
      ? (() => {
          const headIds = new Set(members.filter(m => m.headId).map(m => m.headId!.toString()));
          return members.find(m => headIds.has(m.id.toString())) ?? null;
        })()
      : null);

  return { familyId: me.familyId, head, members };
}
