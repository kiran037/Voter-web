// app/api/voters/[id]/family/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

function toId(s: string) { try { return BigInt(s); } catch { return null; } }

type KinRelation = "SPOUSE" | "CHILD" | "PARENT" | "SIBLING" | "OTHER";
type ParamsPromise = { params: Promise<{ id: string }> };

function inverseRelation(r: KinRelation): KinRelation {
  switch (r) {
    case "CHILD":   return "PARENT";
    case "PARENT":  return "CHILD";
    case "SPOUSE":  return "SPOUSE";
    case "SIBLING": return "SIBLING";
    default:        return "OTHER";
  }
}

/**
 * Canonicalize a link so we store exactly one DB row:
 * - Asymmetric:
 *     CHILD/PARENT -> store as CHILD with (childId -> parentId)
 * - Symmetric (SPOUSE/SIBLING/OTHER):
 *     store with (a=min(A,B), b=max(A,B), relation stays the same)
 */
function canonicalize(a: bigint, b: bigint, relation: KinRelation): { voterId: bigint; relativeId: bigint; relation: KinRelation } {
  if (relation === "CHILD" || relation === "PARENT") {
    const childId = relation === "CHILD" ? a : b;
    const parentId = relation === "CHILD" ? b : a;
    return { voterId: childId, relativeId: parentId, relation: "CHILD" };
  }
  // symmetric
  const x = a < b ? a : b;
  const y = a < b ? b : a;
  return { voterId: x, relativeId: y, relation };
}

// ---------- GET (list family for a voter, normalized to viewer’s perspective) ----------
export async function GET(_: NextRequest, ctx: ParamsPromise) {
  const { id } = await ctx.params;
  const viewerId = toId(id);
  if (!viewerId) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  // We only store one canonical row. But the viewer can be either side of that row.
  // Fetch any canonical rows where viewer is either voterId or relativeId.
  const links = await prisma.voterKin.findMany({
    where: {
      OR: [{ voterId: viewerId }, { relativeId: viewerId }],
    },
    include: {
      voter:    { select: { id: true, name: true, village: true, mobile1: true } },
      relative: { select: { id: true, name: true, village: true, mobile1: true } },
    },
    orderBy: { id: "desc" },
  });

  const items = links.map(l => {
    const viewerIsLeft = l.voterId === viewerId; // left side of canonical row
    const other = viewerIsLeft ? l.relative : l.voter;
    let rel: KinRelation = l.relation as KinRelation;

    // Adjust relation label from viewer’s perspective
    // l.relation is canonical; if viewer is on the "other" side of an asymmetric relation, invert it.
    if (!viewerIsLeft && (rel === "CHILD")) rel = "PARENT";
    // For symmetric (SPOUSE/SIBLING/OTHER), label stays same from both sides.

    return {
      linkId: l.id.toString(),
      relation: rel,
      notes: l.notes ?? null,
      relative: {
        id: other.id.toString(),
        name: other.name,
        village: other.village,
        mobile1: other.mobile1,
      },
    };
  });

  return NextResponse.json({ items });
}

// ---------- POST (create/update a single canonical row only) ----------
export async function POST(req: NextRequest, ctx: ParamsPromise) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const a = toId(id);
  if (!a) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = await req.json();
  const b = toId(String(body?.relativeId));
  const rel = String(body?.relation || "").toUpperCase() as KinRelation;
  const notes = (body?.notes ?? null) as string | null;

  if (!b) return NextResponse.json({ error: "invalid relativeId" }, { status: 400 });
  if (a === b) return NextResponse.json({ error: "cannot link self" }, { status: 400 });
  if (!["SPOUSE","CHILD","PARENT","SIBLING","OTHER"].includes(rel)) {
    return NextResponse.json({ error: "invalid relation" }, { status: 400 });
  }

  const canon = canonicalize(a, b, rel);

  try {
    // Single-row idempotent write
    const saved = await prisma.voterKin.upsert({
      where: {
        voterId_relativeId_relation: {
          voterId: canon.voterId,
          relativeId: canon.relativeId,
          relation: canon.relation,
        },
      },
      create: { ...canon, notes },
      update: { notes: notes ?? undefined },
      select: { id: true },
    });

    return NextResponse.json({ linkId: saved.id.toString() }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // unique hit -> already exists (idempotent)
      return NextResponse.json({ error: "link already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}

// ---------- DELETE (remove the single canonical row) ----------
export async function DELETE(req: NextRequest, ctx: ParamsPromise) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const a = toId(id);
  if (!a) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const linkId = body?.linkId ? toId(String(body.linkId)) : null;

  try {
    if (linkId) {
      // Delete by id (recommended; your UI sends linkId)
      await prisma.voterKin.delete({ where: { id: linkId } });
      return NextResponse.json({ ok: true });
    }

    // (Optional fallback) delete by pair+relation sent in body
    const b = body?.relativeId ? toId(String(body.relativeId)) : null;
    const rel = String(body?.relation || "").toUpperCase() as KinRelation;
    if (!b || !rel) return NextResponse.json({ error: "linkId or (relativeId+relation) required" }, { status: 400 });

    const canon = canonicalize(a, b, rel);
    const result = await prisma.voterKin.deleteMany({
      where: {
        voterId: canon.voterId,
        relativeId: canon.relativeId,
        relation: canon.relation,
      },
    });

    if (result.count === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
