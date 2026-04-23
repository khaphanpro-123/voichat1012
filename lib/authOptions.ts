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
          
          // ⚠️ Fix: Check if credentials exist
          if (!credentials?.email || !credentials?.password) {
            console.log("[Auth] Missing email or password");
            return null;
          }
          
          // ⚠️ Fix: Normalize email safely
          const normalizedEmail = credentials.email.trim().toLowerCase();
          console.log("[Auth] Authorize - normalized email:", normalizedEmail);
          
          const user = (await User.findOne({ email: normalizedEmail })) as any;
          if (!user) {
            console.log("[Auth] User not found:", normalizedEmail);
            return null;
          }

          const ok = await comparePassword(credentials.password, user.password);
          if (!ok) {
            console.log("[Auth] Password mismatch for:", normalizedEmail);
            return null;
          }

          console.log("[Auth] User authorized:", {
            email: user.email,
            role: user.role,
          });

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
      try {
        if (user) {
          token.id = user.id;
          token.dbId = user.id;
          token.role = (user as any).role;
        }
        // ⚠️ Fix: Normalize email in JWT callback safely
        if (token.email && !token.dbId) {
          try {
            await connectDB();
            const normalizedEmail = token.email.trim().toLowerCase();
            console.log("[JWT] Refreshing token for email:", normalizedEmail);
            
            const dbUser = (await User.findOne({ email: normalizedEmail })) as any;
            if (dbUser) {
              token.dbId = dbUser._id.toString();
              token.role = dbUser.role;
              console.log("[JWT] Token updated with role:", dbUser.role);
            } else {
              console.log("[JWT] User not found in database:", normalizedEmail);
            }
          } catch (dbError) {
            console.error("[JWT] Database error:", dbError);
          }
        }
      } catch (error) {
        console.error("[JWT] Callback error:", error);
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (session.user) {
          (session.user as any).id = token.dbId || token.id || token.sub;
          // ⚠️ Fix: Ensure role is always set in session
          (session.user as any).role = token.role || "user";
          console.log("[Session] Session updated:", {
            email: session.user.email,
            role: (session.user as any).role,
          });
        }
      } catch (error) {
        console.error("[Session] Callback error:", error);
      }
      return session;
    },
  },
};
