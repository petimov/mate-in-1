import { NextResponse } from "next/server";

import { ADMIN_COOKIE, getAdminPassword, sessionToken } from "@/lib/admin-session";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: string };
  if (body.password !== getAdminPassword()) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: sessionToken(),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
