import { MongoClient } from "mongodb";

async function checkAdminUsers() {
  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB;

  if (!mongoUri || !dbName) {
    console.error("❌ Missing MONGO_URI or MONGO_DB environment variables");
    process.exit(1);
  }

  console.log(`📊 Checking admin users in database: ${dbName}`);
  console.log(`🔗 Connection: ${mongoUri.split("@")[1]}`);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db(dbName);

    // Count all users
    const totalUsers = await db.collection("users").countDocuments();
    console.log(`\n📈 Total users: ${totalUsers}`);

    // Count admin users
    const adminUsers = await db.collection("users").countDocuments({ role: "admin" });
    console.log(`👑 Admin users: ${adminUsers}`);

    // Get all users
    const allUsers = await db
      .collection("users")
      .find({})
      .project({ email: 1, role: 1, fullName: 1, createdAt: 1 })
      .toArray();

    console.log(`\n📋 All users:`);
    allUsers.forEach((user, index) => {
      const roleEmoji = user.role === "admin" ? "👑" : "👤";
      console.log(
        `  ${index + 1}. ${roleEmoji} ${user.email} (${user.role}) - ${user.fullName}`
      );
    });

    if (adminUsers === 0) {
      console.log(`\n⚠️  No admin users found!`);
      console.log(`\n💡 To create an admin user, run:`);
      console.log(`   db.users.updateOne({email: "your-email@example.com"}, {$set: {role: "admin"}})`);
    } else {
      console.log(`\n✅ Found ${adminUsers} admin user(s)`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

checkAdminUsers();
