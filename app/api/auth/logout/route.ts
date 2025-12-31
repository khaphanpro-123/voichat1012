// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out" });

  // Xóa cookie "auth-token" (đúng tên đã set khi login)
  res.cookies.set("auth-token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}
