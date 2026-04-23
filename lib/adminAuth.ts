import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { connectToDatabase } from "./mongodb";

export async function checkAdminAuth() {
  try {
    const session = await getServerSession(authOptions);
    
    console.log("[AdminAuth] Checking admin access...");
    console.log("[AdminAuth] Session:", {
      exists: !!session,
      email: session?.user?.email,
      sessionRole: (session?.user as any)?.role,
    });

    if (!session?.user?.email) {
      console.log("[AdminAuth] ❌ No session or email");
      return { isAdmin: false, error: "Unauthorized", status: 401 };
    }

    // Check session role first (from JWT)
    const sessionRole = (session.user as any)?.role;
    if (sessionRole === "admin") {
      console.log("[AdminAuth] ✅ Admin verified from session role");
      // Still verify with database
      try {
        const { db } = await connectToDatabase();
        const email = session.user.email.trim().toLowerCase();
        const user = await db.collection("users").findOne({ email });
        
        if (user && user.role === "admin") {
          console.log("[AdminAuth] ✅ Database confirms admin role");
          return { isAdmin: true, userId: user._id.toString(), user };
        }
      } catch (dbErr) {
        console.error("[AdminAuth] ⚠️ Database check failed, but session says admin:", dbErr);
        // Trust session if database fails
        return { isAdmin: true, userId: (session.user as any).id };
      }
    }

    // If session doesn't have admin role, check database
    console.log("[AdminAuth] Session role is not admin, checking database...");
    const { db } = await connectToDatabase();
    const email = session.user.email.trim().toLowerCase();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      console.log("[AdminAuth] ❌ User not found in database");
      return { isAdmin: false, error: "User not found", status: 403 };
    }

    if (user.role !== "admin") {
      console.log("[AdminAuth] ❌ User role is:", user.role);
      return { isAdmin: false, error: "Admin access required", status: 403 };
    }

    console.log("[AdminAuth] ✅ Admin verified from database");
    return { isAdmin: true, userId: user._id.toString(), user };
    
  } catch (error) {
    console.error("[AdminAuth] ❌ Error:", error);
    return { isAdmin: false, error: "Server error", status: 500 };
  }
}
