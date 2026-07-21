// lib/authOptions.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";
import { comparePassword } from "@/lib/auth";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          await connectDB();
          
          if (!credentials?.email || !credentials?.password) {
            console.log("[Auth] Missing email or password");
            return null;
          }
          
          // Normalize email to lowercase
          const normalizedEmail = credentials.email.trim().toLowerCase();
          console.log("[Auth] Looking for user:", normalizedEmail);
          
          const user = (await User.findOne({ email: normalizedEmail })) as any;
          if (!user) {
            console.log("[Auth] User not found");
            return null;
          }

          const ok = await comparePassword(credentials.password, user.password);
          if (!ok) {
            console.log("[Auth] Password mismatch");
            return null;
          }

          console.log("[Auth] Login success:", user.email, "role:", user.role);

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.fullName,
            image: user.avatar,
            role: user.role,
          };
        } catch (error) {
          console.error("[Auth] Authorize error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.dbId = user.id;
        token.role = (user as any).role;
      }
      if (token.email && !token.dbId) {
        try {
          await connectDB();
          const dbUser = (await User.findOne({ email: token.email })) as any;
          if (dbUser) {
            token.dbId = dbUser._id.toString();
            token.role = dbUser.role;
          }
        } catch (error) {
          console.error("JWT callback error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.dbId || token.id || token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
