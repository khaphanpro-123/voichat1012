import { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get NextAuth token
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  const protectedRoutes = ["/dashboard-new", "/dashboard", "/assessment", "/profile", "/admin"]
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )

  const authRoutes = ["/auth/login", "/auth/register"]
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Protect routes - redirect to login if not authenticated
  if (isProtectedRoute) {
    if (!token) {
      console.log("❌ No token found, redirecting to login")
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }

    // Check if admin route and user is not admin
    if (pathname.startsWith("/admin") && token.role !== "admin") {
      console.log("❌ User is not admin, redirecting to user dashboard")
      return NextResponse.redirect(new URL("/dashboard-new", request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && token) {
    console.log("✅ User already authenticated, redirecting to dashboard")
    // Redirect based on role
    if (token.role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url))
    } else {
      return NextResponse.redirect(new URL("/dashboard-new", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard-new/:path*",
    "/dashboard/:path*",
    "/assessment/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/auth/login",
    "/auth/register",
  ],
}
