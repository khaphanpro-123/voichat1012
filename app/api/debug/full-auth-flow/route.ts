import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectToDatabase } from "@/lib/mongodb";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";

export async function GET(req: NextRequest) {
  try {
    console.log("\n========== FULL AUTH FLOW DEBUG ==========\n");

    // Step 1: Get session
    console.log("STEP 1: Getting session from NextAuth...");
    const session = await getServerSession(authOptions);
    console.log("Session result:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email,
      sessionRole: (session?.user as any)?.role,
    });

    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        step: "session",
        message: "No session found - user not logged in",
      });
    }

    // Step 2: Check email
    console.log("\nSTEP 2: Checking email in session...");
    if (!session.user.email) {
      return NextResponse.json({
        success: false,
        step: "email_check",
        message: "Session email is missing",
      });
    }
    console.log("✅ Email found:", session.user.email);

    // Step 3: Normalize email
    console.log("\nSTEP 3: Normalizing email...");
    const normalizedEmail = session.user.email.trim().toLowerCase();
    console.log("Normalization result:", {
      original: session.user.email,
      normalized: normalizedEmail,
      trimmed: session.user.email.trim(),
      lowercased: session.user.email.toLowerCase(),
    });

    // Step 4: Connect to MongoDB (MongoClient)
    console.log("\nSTEP 4: Connecting to MongoDB (MongoClient)...");
    let mongoUser;
    try {
      const { db } = await connectToDatabase();
      console.log("✅ MongoDB connected");

      mongoUser = await db.collection("users").findOne({ email: normalizedEmail });
      console.log("MongoDB query result:", {
        found: !!mongoUser,
        email: mongoUser?.email,
        role: mongoUser?.role,
        _id: mongoUser?._id,
      });
    } catch (mongoErr: any) {
      console.error("❌ MongoDB error:", mongoErr.message);
      return NextResponse.json({
        success: false,
        step: "mongodb_query",
        message: "MongoDB query failed",
        error: mongoErr.message,
      });
    }

    // Step 5: Connect to Mongoose
    console.log("\nSTEP 5: Connecting to Mongoose...");
    let mongooseUser;
    try {
      await connectDB();
      console.log("✅ Mongoose connected");

      mongooseUser = await User.findOne({ email: normalizedEmail });
      console.log("Mongoose query result:", {
        found: !!mongooseUser,
        email: mongooseUser?.email,
        role: mongooseUser?.role,
        _id: mongooseUser?._id,
      });
    } catch (mongooseErr: any) {
      console.error("❌ Mongoose error:", mongooseErr.message);
      return NextResponse.json({
        success: false,
        step: "mongoose_query",
        message: "Mongoose query failed",
        error: mongooseErr.message,
      });
    }

    // Step 6: Compare results
    console.log("\nSTEP 6: Comparing MongoDB vs Mongoose results...");
    const comparison = {
      mongodbFound: !!mongoUser,
      mongooseFound: !!mongooseUser,
      mongodbRole: mongoUser?.role,
      mongooseRole: mongooseUser?.role,
      mongodbEmail: mongoUser?.email,
      mongooseEmail: mongooseUser?.email,
      match: mongoUser?.email === mongooseUser?.email && mongoUser?.role === mongooseUser?.role,
    };
    console.log("Comparison:", comparison);

    // Step 7: Check admin status
    console.log("\nSTEP 7: Checking admin status...");
    const isAdmin = mongoUser?.role === "admin" || mongooseUser?.role === "admin";
    console.log("Admin check:", {
      sessionRole: (session?.user as any)?.role,
      mongodbRole: mongoUser?.role,
      mongooseRole: mongooseUser?.role,
      isAdmin: isAdmin,
    });

    // Final result
    console.log("\n========== FINAL RESULT ==========");
    return NextResponse.json({
      success: true,
      summary: {
        sessionEmail: session.user.email,
        normalizedEmail: normalizedEmail,
        sessionRole: (session?.user as any)?.role,
        mongodbRole: mongoUser?.role,
        mongooseRole: mongooseUser?.role,
        isAdmin: isAdmin,
        userId: mongoUser?._id || mongooseUser?._id,
      },
      details: {
        session: {
          hasSession: !!session,
          email: session.user.email,
          role: (session?.user as any)?.role,
        },
        mongodb: {
          found: !!mongoUser,
          email: mongoUser?.email,
          role: mongoUser?.role,
        },
        mongoose: {
          found: !!mongooseUser,
          email: mongooseUser?.email,
          role: mongooseUser?.role,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Unexpected error",
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
