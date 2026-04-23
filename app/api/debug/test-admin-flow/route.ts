import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { getToken } from "next-auth/jwt";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    console.log("\n========== ADMIN FLOW DEBUG ==========\n");

    // Step 1: Get session
    console.log("STEP 1: Getting session...");
    const session = await getServerSession(authOptions);
    console.log("Session:", {
      hasSession: !!session,
      email: session?.user?.email,
      sessionRole: (session?.user as any)?.role,
    });

    // Step 2: Get JWT token (what middleware sees)
    console.log("\nSTEP 2: Getting JWT token (middleware view)...");
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    console.log("JWT Token:", {
      hasToken: !!token,
      email: token?.email,
      tokenRole: token?.role,
      dbId: token?.dbId,
    });

    // Step 3: Check database
    console.log("\nSTEP 3: Checking database...");
    if (session?.user?.email) {
      const { db } = await connectToDatabase();
      const email = session.user.email.trim().toLowerCase();
      const user = await db.collection("users").findOne({ email });
      console.log("Database user:", {
        found: !!user,
        email: user?.email,
        role: user?.role,
      });
    }

    // Step 4: Test admin API (using internal call, not fetch)
    console.log("\nSTEP 4: Testing admin auth check...");
    let authCheckResult;
    try {
      const { checkAdminAuth } = await import("@/lib/adminAuth");
      authCheckResult = await checkAdminAuth();
      console.log("Admin auth check result:", authCheckResult);
    } catch (authErr: any) {
      authCheckResult = {
        error: authErr.message,
      };
      console.log("Admin auth check error:", authErr);
    }

    // Summary
    const summary = {
      session: {
        exists: !!session,
        email: session?.user?.email,
        role: (session?.user as any)?.role,
      },
      token: {
        exists: !!token,
        email: token?.email,
        role: token?.role,
      },
      middleware: {
        willAllow: token?.role === "admin",
        reason: token?.role === "admin" ? "Token has admin role" : `Token role is: ${token?.role}`,
      },
      adminAuth: authCheckResult,
    };

    console.log("\n========== SUMMARY ==========");
    console.log(JSON.stringify(summary, null, 2));

    return NextResponse.json({
      success: true,
      summary,
      diagnosis: {
        sessionHasRole: !!(session?.user as any)?.role,
        tokenHasRole: !!token?.role,
        rolesMatch: (session?.user as any)?.role === token?.role,
        middlewareWillBlock: token?.role !== "admin",
        issue: token?.role !== "admin" ? "JWT token does not have admin role - middleware will block" : "No issue detected",
      },
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
