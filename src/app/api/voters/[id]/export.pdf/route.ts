// src/app/api/voters/[id]/export.pdf/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function toId(s: string) { try { return BigInt(s); } catch { return null; } }
type ParamsPromise = { params: Promise<{ id: string }> };

// -------- helpers (format) ----------
function fmtDate(d?: Date | string | null) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = dt.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
function ageFromDob(d?: Date | string | null) {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - dt.getFullYear();
  const m = now.getMonth() - dt.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dt.getDate())) a--;
  return a;
}

export async function GET(req: NextRequest, ctx: ParamsPromise) {
  const { id: idStr } = await ctx.params;
  const id = toId(idStr);
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  const v = await prisma.voter.findUnique({
    where: { id },
    include: { head: { select: { id: true, name: true } } },
  });
  if (!v) return NextResponse.json({ error: "not found" }, { status: 404 });

  let family: { name: string; village: string | null; mobile1: string | null; voterId: string | null }[] = [];
  if (v.familyId) {
    family = await prisma.voter.findMany({
      where: { familyId: v.familyId, NOT: { id: v.id } },
      select: { name: true, village: true, mobile1: true, voterId: true },
      orderBy: { id: "asc" },
      take: 200,
    });
  }

  const bytes = await buildOnePageMarksheet(v, family); // Uint8Array

  // ✅ Force a plain ArrayBuffer and wrap in a Blob to satisfy TS + NextResponse BodyInit
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([ab], { type: "application/pdf" });

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="voter-${v.id}.pdf"`,
    },
  });
}

// ---------- PDF (clean, B/W, single-page) ----------
async function buildOnePageMarksheet(
  v: any,
  family: Array<{ name: string; village: string | null; mobile1: string | null; voterId: string | null }>
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const W = 595.28;  // A4 width
  const H = 841.89;  // A4 height
  const page = doc.addPage([W, H]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontB = await doc.embedFont(StandardFonts.HelveticaBold);
  const BLACK = rgb(0, 0, 0);
  const GRAY = rgb(0.35, 0.35, 0.35);
  const LIGHT = rgb(0.92, 0.92, 0.92);

  const M = 30, rowH = 18, headH = 16, bw = 0.8;
  let y = H - M;

  const tw = (s: string, size = 10, bold = false) =>
    (bold ? fontB : font).widthOfTextAtSize(s, size);
  const text = (s: string, x: number, yTop: number, size = 10, bold = false, color = BLACK) =>
    page.drawText(s ?? "", { x, y: yTop - size - 2, size, font: bold ? fontB : font, color });
  const line = (x1: number, y1: number, x2: number, y2: number, color = BLACK, width = bw) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, color, thickness: width });
  const cell = (x: number, yTop: number, w: number, h: number, shaded = false) =>
    page.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: BLACK, borderWidth: bw, color: shaded ? LIGHT : undefined });
  const fit = (s: string, maxW: number, size = 10, bold = false) => {
    const str = String(s ?? "");
    if (tw(str, size, bold) <= maxW) return str;
    let out = "";
    for (const ch of str) {
      const test = out + ch + "...";
      if (tw(test, size, bold) <= maxW) out += ch; else break;
    }
    return out + (out.length < str.length ? "..." : "");
  };

  // Title + meta
  {
    const title = "VOTER INFORMATION RECORD";
    text(title, (W - tw(title, 14, true)) / 2, y, 14, true);
    y -= 22;
    const date = new Date().toLocaleDateString("en-GB");
    const meta = `Ref: ${String(v.id)}    Date: ${date}`;
    text(meta, (W - tw(meta, 9)) / 2, y, 9, false, GRAY);
    y -= 18;
  }

  const section = (label: string) => {
    const fullW = W - 2 * M;
    cell(M, y, fullW, headH, true);
    text(label, M + 6, y, 10, true);
    y -= headH;
  };
  const row2 = (l1: string, v1: string, l2: string, v2: string) => {
    const fullW = W - 2 * M; const half = fullW / 2;
    cell(M, y, half, rowH);
    text(fit(l1, 70, 9, true), M + 6, y, 9, true, GRAY);
    text(fit(v1, half - 80, 10), M + 78, y, 10);
    cell(M + half, y, half, rowH);
    text(fit(l2, 70, 9, true), M + half + 6, y, 9, true, GRAY);
    text(fit(v2, half - 80, 10), M + half + 78, y, 10);
    y -= rowH;
  };
  const row1 = (label: string, value: string) => {
    const fullW = W - 2 * M;
    cell(M, y, fullW, rowH);
    text(fit(label, 90, 9, true), M + 6, y, 9, true, GRAY);
    text(fit(value, fullW - 100, 10), M + 98, y, 10);
    y -= rowH;
  };

  // PERSONAL
  section("PERSONAL DETAILS");
  const dobStr = fmtDate(v.dob);
  const derivedAge = v.age ?? ageFromDob(v.dob);
  row2("Name", v.name ?? "", "Voter ID", v.voterId ?? "");
  row2("DOB", dobStr || "-", "Age", derivedAge != null ? String(derivedAge) : "-");
  row2("Gender", v.gender ?? "-", "Village", v.village ?? "-");
  row1("Address", v.address ?? "-");
  y -= 8;

  // BOOTH
  section("BOOTH & ROLL");
  row2("Booth", v.boothName ?? "-", "Booth No", v.boothNo != null ? String(v.boothNo) : "-");
  row2("Part No", v.partNo != null ? String(v.partNo) : "-", "SRN", v.srn != null ? String(v.srn) : "-");
  y -= 8;

  // CONTACT & STATUS
  section("CONTACT & STATUS");
  row2("Mobile 1", v.mobile1 ?? "-", "Mobile 2", v.mobile2 ?? "-");
  row2("Email", v.email ?? "-", "Colour Code", v.colourCode ?? "-");
  row2("Voted", v.voted ? "Yes" : "No", "Star Voter", v.starVoter ? "Yes" : "No");
  row1("Status", v.dead ? "Deceased" : "Alive");
  y -= 8;

  // SURVEY
  section("SURVEY DATA");
  row2("Caste", v.caste ?? "-", "Profession", v.profession ?? "-");
  row1("Demands", v.demands ?? "-");
  row1("Notes", v.extraInfo ?? "-");
  y -= 8;

  // FAMILY
  section("FAMILY INFORMATION");
  row2("Family ID", v.familyId ?? "-", "Role", v.relationToHead ?? "-");
  row1("Family Head", v.head?.name ? String(v.head.name) : (v.headId ? String(v.headId) : "-"));
  y -= 10;

  // FAMILY TABLE
  const usableH = y - (M + 50);
  const tableW = W - 2 * M;
  const th = 16, trH = 16;
  const c0 = 22, c1 = 140, c2 = 105, c3 = 110, c4 = tableW - (c0 + c1 + c2 + c3);
  const x0 = M, x1 = x0 + c0, x2 = x1 + c1, x3 = x2 + c2, x4 = x3 + c3;

  cell(M, y, tableW, th, true);
  text("#", x0 + 4, y, 8, true);
  text("Name", x1 + 4, y, 8, true);
  text("Village", x2 + 4, y, 8, true);
  text("Mobile", x3 + 4, y, 8, true);
  text("Voter ID", x4 + 4, y, 8, true);
  line(x1, y, x1, y - th); line(x2, y, x2, y - th);
  line(x3, y, x3, y - th); line(x4, y, x4, y - th);
  y -= th;

  const maxRows = Math.max(0, Math.floor(usableH / trH));
  const rows = family.slice(0, maxRows);
  const overflow = Math.max(0, family.length - rows.length);

  for (let i = 0; i < rows.length; i++) {
    cell(M, y, tableW, trH);
    const m = rows[i];
    text(String(i + 1), x0 + 4, y, 9);
    text(fit(m.name ?? "-", c1 - 8, 9), x1 + 4, y, 9);
    text(fit(m.village ?? "-", c2 - 8, 9), x2 + 4, y, 9);
    text(fit(m.mobile1 ?? "-", c3 - 8, 9), x3 + 4, y, 9);
    text(fit(m.voterId ?? "-", c4 - 8, 9), x4 + 4, y, 9);
    line(x1, y, x1, y - trH); line(x2, y, x2, y - trH);
    line(x3, y, x3, y - trH); line(x4, y, x4, y - trH);
    y -= trH;
  }
  if (overflow > 0) text(`+ ${overflow} more member(s)`, M + 4, y - 2, 8, true, GRAY);

  // footer
  line(M, M + 12, W - M, M + 12, BLACK, 0.5);
  text("Confidential — For Official Use Only", M, M + 2, 8, false, GRAY);
  const right = "Generated by Voter CMS";
  text(right, W - M - tw(right, 8), M + 2, 8, false, GRAY);

  return await doc.save();
}
