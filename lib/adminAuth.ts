import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { connectToDatabase } from "./mongodb";
import { ObjectId } from "mongodb";

export async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { isAdmin: false, error: "Unauthorized", status: 401 };
  }

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne({ email: session.user.email });

    if (!user || user.role !== "admin") {
      return { isAdmin: false, error: "Forbidden - Admin access required", status: 403 };
    }

    return { isAdmin: true, userId: user._id.toString(), user };
  } catch (error) {
    console.error("[AdminAuth] Error:", error);
    return { isAdmin: false, error: "Server error", status: 500 };
  }
}
