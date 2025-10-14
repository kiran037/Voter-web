///Users/xeoren/voter-web/src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  return NextResponse.json({
    user: {
      id: user.id.toString(),
      phone: user.phone,
      name: user.name,
      role: user.role,
      phoneVerifiedAt: user.phoneVerifiedAt,
      createdAt: user.createdAt,
    },
  });
}
