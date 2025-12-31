import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "@/app/models/User";

// ===============================
// 1. Password helpers
// ===============================
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  password: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

// ===============================
// 2. JWT helpers
// ===============================
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export interface JwtPayload {
  id: string;
  role: "user" | "admin";
}

export function signToken(userId: string, role: string) {
  if (!process.env.JWT_SECRET) {
    throw new Error("❌ Missing JWT_SECRET in environment");
  }

  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // 7 ngày
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// ===============================
// 3. Extract Bearer token from Request
// ===============================
export function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return null;
}

// ===============================
// 4. Get current auth user
// ===============================
export async function getAuthUser(req: Request) {
  const tok = getBearerToken(req);
  if (!tok) return null;

  const payload = verifyToken(tok);
  if (!payload || !mongoose.Types.ObjectId.isValid(payload.id)) return null;

  const user = await User.findById(payload.id).lean();
  if (!user) return null;

  return {
    id: payload.id,
    role: payload.role, // ✅ luôn có role từ token
    email: user.email,
    fullName: user.fullName,
    avatar: user.avatar,
  };
}
