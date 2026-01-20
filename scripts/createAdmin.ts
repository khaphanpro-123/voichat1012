import { connectDB } from "../lib/db";
import User from "../app/models/User";
import bcrypt from "bcryptjs";

// Load environment variables from .env file
require("dotenv").config();

async function createAdmin() {
  try {
    await connectDB();

    const adminData = {
      username: "admin",
      email: "admin@gmail.com",
      password: "jvm*YM>2",
      fullName: "admin",
      role: "admin",
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log("Admin account already exists!");
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Create admin user
    const admin = await User.create({
      username: adminData.username,
      email: adminData.email,
      password: hashedPassword,
      fullName: adminData.fullName,
      role: adminData.role,
      emailVerified: true,
    });

    console.log("Admin account created successfully!");
    console.log("Email:", adminData.email);
    console.log("Password:", adminData.password);
    console.log("Admin ID:", admin._id);

  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    process.exit();
  }
}

createAdmin();
