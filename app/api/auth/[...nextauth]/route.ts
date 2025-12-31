// [...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import User from "@/app/models/User";
import { comparePassword } from "@/lib/auth";

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await connectDB();
        const user = await User.findOne({ email: credentials?.email }) as any;
        if (!user) return null;

        const ok = await comparePassword(credentials!.password, user.password);
        if (!ok) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.fullName,
          image: user.avatar,
        };
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
  callbacks: {
    async jwt({ token, user }) {
      // Khi user đăng nhập lần đầu, lưu id vào token
      if (user) {
        token.id = user.id;
        token.dbId = user.id;
      }
      // Nếu chưa có dbId, lấy từ DB
      if (token.email && !token.dbId) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: token.email }) as any;
          if (dbUser) {
            token.dbId = dbUser._id.toString();
          }
        } catch (error) {
          console.error("JWT callback error:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Đảm bảo id luôn được set
        (session.user as any).id = token.dbId || token.id || token.sub;
      }
      console.log('Session user id:', (session.user as any).id);
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
