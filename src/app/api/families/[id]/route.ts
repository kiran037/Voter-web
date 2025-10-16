// // src/app/api/families/[id]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

// Helpers
async function readFamilyParam(paramsPromise: Promise<{ id: string }>) {
  const { id } = await paramsPromise;
  return decodeURIComponent((id || "").trim());
}

// GET /api/families/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const familyId = await readFamilyParam(ctx.params);
  if (!familyId) return NextResponse.json({ error: "invalid family id" }, { status: 400 });

  const members = await prisma.voter.findMany({
    where: { familyId },
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
  const explicitHead = members.find((m) => m.relationToHead === "HEAD");
  const inferredHead =
    explicitHead ??
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
    familyId,
    head: inferredHead ? { id: inferredHead.id.toString(), name: inferredHead.name } : null,
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

// PUT /api/families/[id]
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const familyId = await readFamilyParam(ctx.params);
  if (!familyId) return NextResponse.json({ error: "invalid family id" }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));

  // Accept headVoterId or headId (string | null)
  let headStr: string | null | undefined = undefined;
  if (Object.prototype.hasOwnProperty.call(body, "headVoterId")) headStr = body.headVoterId;
  else if (Object.prototype.hasOwnProperty.call(body, "headId")) headStr = body.headId;

  if (headStr !== undefined) {
    if (headStr === null) {
      const members = await prisma.voter.findMany({ where: { familyId }, select: { id: true } });
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
    // Mark head
    tx.push(
      prisma.voter.update({
        where: { id: head.id },
        data: { relationToHead: "HEAD" as any, headId: null },
      }),
    );
    // Point everyone else to head; demote accidental HEADs
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

  // Nothing to change
  return NextResponse.json({ ok: true });
}

// DELETE /api/families/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const familyId = await readFamilyParam(ctx.params);
  if (!familyId) return NextResponse.json({ error: "invalid family id" }, { status: 400 });

  const count = await prisma.voter.updateMany({
    where: { familyId },
    data: { familyId: null, relationToHead: null, headId: null },
  });

  return NextResponse.json({ ok: true, cleared: count.count });
}
