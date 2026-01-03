/**
 * Next.js Instrumentation - Pre-warm DB connection on server start
 * This runs once when the server starts
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Instrumentation] Pre-warming MongoDB connection...");
    
    try {
      const { connectDB } = await import("./lib/db");
      await connectDB();
      console.log("[Instrumentation] MongoDB connection ready");
    } catch (error) {
      console.error("[Instrumentation] Failed to pre-warm MongoDB:", error);
    }
  }
}
