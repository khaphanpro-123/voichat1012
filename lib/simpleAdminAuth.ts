// Simple Admin Auth - No complexity, just works
import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { connectToDatabase } from "./mongodb";

export async function isUserAdmin() {
  try {
    // Step 1: Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log("❌ No session or email");
      return false;
    }

    // Step 2: Get user from database
    const { db } = await connectToDatabase();
    const email = session.user.email.trim().toLowerCase();
    
    const user = await db.collection("users").findOne({ 
      email: email 
    });

    // Step 3: Check if admin
    const isAdmin = user?.role === "admin";
    console.log(`✅ User ${email} is admin: ${isAdmin}`);
    
    return isAdmin;
  } catch (error) {
    console.error("❌ Admin check error:", error);
    return false;
  }
}

export async function requireAdmin() {
  const isAdmin = await isUserAdmin();
  if (!isAdmin) {
    throw new Error("Admin access required");
  }
  return true;
}
