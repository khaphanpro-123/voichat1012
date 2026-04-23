import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { connectToDatabase } from "./mongodb";
import { ObjectId } from "mongodb";

export async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  
  console.log("[AdminAuth] Session:", {
    hasSession: !!session,
    email: session?.user?.email,
    role: (session?.user as any)?.role,
  });

  // ⚠️ Fix 1: Check if session exists
  if (!session || !session.user) {
    console.log("[AdminAuth] No session found");
    return { isAdmin: false, error: "Unauthorized", status: 401 };
  }

  // ⚠️ Fix 2: Check if email exists in session
  if (!session.user.email) {
    console.log("[AdminAuth] Session email is missing");
    return { isAdmin: false, error: "Session email missing", status: 401 };
  }

  try {
    const { db } = await connectToDatabase();
    console.log("[AdminAuth] Database connected");

    // ⚠️ Fix 3: Normalize email (trim + lowercase)
    const normalizedEmail = session.user.email.trim().toLowerCase();
    console.log("[AdminAuth] Normalized email:", normalizedEmail);

    // ⚠️ Fix 4: Query with normalized email
    const user = await db.collection("users").findOne({ email: normalizedEmail });
    console.log("[AdminAuth] User from database:", {
      found: !!user,
      email: user?.email,
      role: user?.role,
    });

    if (!user) {
      console.log("[AdminAuth] User not found in database with email:", normalizedEmail);
      return { isAdmin: false, error: "Forbidden - User not found", status: 403 };
    }

    // ⚠️ Fix 5: Check role exists and is "admin"
    if (!user.role || user.role !== "admin") {
      console.log("[AdminAuth] User role is not admin:", user.role);
      return { isAdmin: false, error: "Forbidden - Admin access required", status: 403 };
    }

    console.log("[AdminAuth] Admin verified successfully");
    return { isAdmin: true, userId: user._id.toString(), user };
  } catch (error) {
    console.error("[AdminAuth] Error:", error);
    return { isAdmin: false, error: "Server error", status: 500 };
  }
}
