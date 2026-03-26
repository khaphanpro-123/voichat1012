import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    // Test MongoDB connection
    const client = await clientPromise;
    await client.db().admin().ping();
    
    return NextResponse.json({ 
      success: true, 
      status: "healthy",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        status: "unhealthy",
        error: "Database connection failed" 
      },
      { status: 503 }
    );
  }
}
