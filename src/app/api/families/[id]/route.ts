// app/api/families/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

// Standard App Router signature
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const raw = decodeURIComponent((params.id || "").trim());
  if (!raw) return NextResponse.json({ error: "invalid family id" }, { status: 400 });

  // In the new schema, family = all voters sharing the same string familyId
  const members = await prisma.voter.findMany({
    where: { familyId: raw },
    select: {
      id: true,
      name: true,
      relationToHead: true,
      headId: true,
      village: true,
      mobile1: true,
    },
    orderBy: [{ relationToHead: "asc" }, { id: "asc" }],
  });

  if (members.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Determine head:
  // 1) explicit relationToHead === 'HEAD'
  // 2) otherwise infer: someone whose id appears as others' headId the most
  let head =
    members.find((m) => m.relationToHead === "HEAD") ??
    (() => {
      const counts = new Map<string, number>();
      for (const m of members) {
        if (m.headId) {
          const k = m.headId.toString();
          counts.set(k, (counts.get(k) || 0) + 1);
        }
      }
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return best ? members.find((m) => m.id.toString() === best) ?? null : null;
    })();

  return NextResponse.json({
    familyId: raw,
    head: head ? { id: head.id.toString(), name: head.name } : null,
    members: members.map((m) => ({
      id: m.id.toString(),
      name: m.name,
      relationToHead: m.relationToHead,
      headId: m.headId ? m.headId.toString() : null,
      village: m.village,
      mobile1: m.mobile1,
    })),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const familyId = decodeURIComponent((params.id || "").trim());
  if (!familyId) return NextResponse.json({ error: "invalid family id" }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));

  // Back-compat: accept headVoterId (string or null). Also accept "headId".
  let headStr: string | null | undefined = undefined;
  if (Object.prototype.hasOwnProperty.call(body, "headVoterId")) {
    headStr = body.headVoterId;
  } else if (Object.prototype.hasOwnProperty.call(body, "headId")) {
    headStr = body.headId;
  }

  // If headStr is provided, normalize family:
  //  - the chosen head must be a member of this family (or null to clear all heads)
  //  - set chosen relationToHead='HEAD' & headId=null
  //  - set all other members headId=<head.id> and demote accidental HEADs to OTHER
  if (headStr !== undefined) {
    if (headStr === null) {
      // Clear head assignments but keep the family grouping
      const members = await prisma.voter.findMany({
        where: { familyId },
        select: { id: true },
      });
      if (members.length > 0) {
        await prisma.$transaction(
          members.map((m) =>
            prisma.voter.update({
              where: { id: m.id },
              data: { headId: null, relationToHead: null },
            }),
          ),
        );
      }
      return NextResponse.json({ ok: true, headCleared: true });
    }

    if (typeof headStr !== "string" || !headStr.trim()) {
      return NextResponse.json({ error: "invalid headVoterId" }, { status: 400 });
    }

    let headIdBig: bigint;
    try {
      headIdBig = BigInt(headStr.trim());
    } catch {
      return NextResponse.json({ error: "invalid headVoterId" }, { status: 400 });
    }

    const [head, members] = await Promise.all([
      prisma.voter.findFirst({
        where: { id: headIdBig as any, familyId },
        select: { id: true },
      }),
      prisma.voter.findMany({
        where: { familyId },
        select: { id: true, relationToHead: true },
      }),
    ]);

    if (!head) return NextResponse.json({ error: "head not in this family" }, { status: 400 });

    const tx: any[] = [];

    // Ensure head points to nobody and is marked HEAD
    tx.push(
      prisma.voter.update({
        where: { id: head.id },
        data: { relationToHead: "HEAD" as any, headId: null },
      }),
    );

    for (const m of members) {
      if (m.id === head.id) continue;
      tx.push(
        prisma.voter.update({
          where: { id: m.id },
          data: {
            headId: head.id,
            relationToHead: m.relationToHead === "HEAD" ? ("OTHER" as any) : undefined,
          },
        }),
      );
    }

    await prisma.$transaction(tx);
    return NextResponse.json({ ok: true, headId: head.id.toString() });
  }

  // No recognized mutating keys; nothing to do
  return NextResponse.json({ ok: true });
}

/**
 * DELETE "family": since there is no Family table, this "disbands" the family.
 * It clears familyId, relationToHead, headId for all members with this familyId.
 * Use carefully!
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // (Match your earlier behavior: no auth required by default; change if needed)
  const familyId = decodeURIComponent((params.id || "").trim());
  if (!familyId) return NextResponse.json({ error: "invalid family id" }, { status: 400 });

  const count = await prisma.voter.updateMany({
    where: { familyId },
    data: { familyId: null, relationToHead: null, headId: null },
  });

  return NextResponse.json({ ok: true, cleared: count.count });
}
