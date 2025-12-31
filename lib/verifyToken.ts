// lib/verifyToken.ts
import { jwtVerify } from "jose";

// Dùng trong Edge Runtime (middleware)
export async function verifyTokenEdge(token: string) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (e) {
    console.error("❌ verifyTokenEdge error:", e)
    return null
  }
}


// Dùng trong API Route (Node runtime)
import jwt from "jsonwebtoken";
export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role?: string };
  } catch {
    return null;
  }
}
