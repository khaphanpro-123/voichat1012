// Script to check and fix admin user
import { connectToDatabase } from "@/lib/mongodb";

async function checkAndFixAdmin() {
  try {
    console.log("🔍 Checking admin user...");
    
    const { db } = await connectToDatabase();
    
    // Find admin user
    const adminUser = await db.collection("users").findOne({ role: "admin" });
    
    if (!adminUser) {
      console.log("❌ No admin user found!");
      console.log("📝 Please create an admin user manually in MongoDB:");
      console.log(`
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "admin" } }
)
      `);
      return;
    }
    
    console.log("✅ Admin user found:");
    console.log({
      email: adminUser.email,
      role: adminUser.role,
      username: adminUser.username,
    });
    
    // Check if email is normalized
    const normalizedEmail = adminUser.email.trim().toLowerCase();
    if (adminUser.email !== normalizedEmail) {
      console.log("⚠️ Email is not normalized!");
      console.log("Original:", adminUser.email);
      console.log("Should be:", normalizedEmail);
      
      // Fix it
      await db.collection("users").updateOne(
        { _id: adminUser._id },
        { $set: { email: normalizedEmail } }
      );
      console.log("✅ Email normalized!");
    }
    
    // Count total users
    const totalUsers = await db.collection("users").countDocuments({ role: "user" });
    console.log(`\n📊 Total users in database: ${totalUsers}`);
    
    console.log("\n✅ Admin check complete!");
    console.log(`\nTo login as admin, use:`);
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: (your password)`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

checkAndFixAdmin();
