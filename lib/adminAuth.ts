import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";
import { connectDB } from "./db";
import User from "@/app/models/User";

export async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return { isAdmin: false, error: "Unauthorized", status: 401 };
  }

  await connectDB();
  const user = await User.findOne({ email: session.user.email });

  if (!user || user.role !== "admin") {
    return { isAdmin: false, error: "Forbidden - Admin access required", status: 403 };
  }

  return { isAdmin: true, userId: user._id.toString(), user };
}
