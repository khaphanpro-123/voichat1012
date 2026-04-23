import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    console.log("🔍 Checking admin user...");
    
    const { db } = await connectToDatabase();
    
    // Find admin user
    const adminUser = await db.collection("users").findOne({ role: "admin" });
    
    if (!adminUser) {
      return NextResponse.json({
        success: false,
        message: "No admin user found in database",
        solution: "Create an admin user by running: db.users.updateOne({ email: 'your-email@example.com' }, { $set: { role: 'admin' } })",
      });
    }
    
    // Check if email is normalized
    const normalizedEmail = adminUser.email.trim().toLowerCase();
    const emailNormalized = adminUser.email === normalizedEmail;
    
    // Count total users
    const totalUsers = await db.collection("users").countDocuments({ role: "user" });
    const totalAdmins = await db.collection("users").countDocuments({ role: "admin" });
    
    return NextResponse.json({
      success: true,
      adminUser: {
        email: adminUser.email,
        normalizedEmail: normalizedEmail,
        emailNormalized: emailNormalized,
        role: adminUser.role,
        username: adminUser.username,
        _id: adminUser._id.toString(),
      },
      stats: {
        totalUsers: totalUsers,
        totalAdmins: totalAdmins,
        totalAll: totalUsers + totalAdmins,
      },
      message: emailNormalized 
        ? "Admin user is correctly configured" 
        : "Admin email needs normalization",
    });
  } catch (error: any) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error checking admin user",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// POST - Fix admin email normalization
export async function POST(req: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    
    // Find admin user
    const adminUser = await db.collection("users").findOne({ role: "admin" });
    
    if (!adminUser) {
      return NextResponse.json({
        success: false,
        message: "No admin user found",
      });
    }
    
    // Normalize email
    const normalizedEmail = adminUser.email.trim().toLowerCase();
    
    if (adminUser.email !== normalizedEmail) {
      await db.collection("users").updateOne(
        { _id: adminUser._id },
        { $set: { email: normalizedEmail } }
      );
      
      return NextResponse.json({
        success: true,
        message: "Admin email normalized successfully",
        before: adminUser.email,
        after: normalizedEmail,
      });
    }
    
    return NextResponse.json({
      success: true,
      message: "Admin email is already normalized",
      email: adminUser.email,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Error fixing admin user",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
