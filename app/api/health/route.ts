/**
 * Health Check & Pre-warm API
 * Call this on app load to warm up DB connection
 */

import { NextResponse } from "next/server";
import { connectDB, isConnected } from "@/lib/db";

export async function GET() {
  const start = Date.now();
  
  try {
    // Pre-warm DB connection
    if (!isConnected()) {
      await connectDB();
    }
    
    const latency = Date.now() - start;
    
    return NextResponse.json({
      status: "ok",
      db: isConnected() ? "connected" : "disconnected",
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      db: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// Disable caching for health check
export const dynamic = "force-dynamic";
