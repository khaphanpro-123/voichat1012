import { type NextRequest, NextResponse } from "next/server"
import { verifyTokenEdge } from "@/lib/verifyToken"

export async function middleware(request: NextRequest) {
  const rawToken = request.cookies.get("auth-token")?.value
  const token = rawToken && rawToken !== "undefined" ? rawToken : null

  const { pathname } = request.nextUrl

  const protectedRoutes = ["/dashboard", "/assessment", "/profile", "/admin"]
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  const authRoutes = ["/login", "/register"]
  const isAuthRoute = authRoutes.includes(pathname)

  if (isProtectedRoute) {
    if (!token) {
      console.log("❌ No token found in cookie")
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const payload = await verifyTokenEdge(token)
    if (!payload || !(payload as any).id) {
      console.log("❌ Invalid token payload:", payload)
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  if (isAuthRoute && token) {
    const payload = await verifyTokenEdge(token)
    if (payload) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/assessment/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
}
