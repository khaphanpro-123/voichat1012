import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from "react";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "VietTalk - Học tiếng Anh hiệu quả",
  description:
    "Nền tảng học tiếng Anh dành cho người Việt với phương pháp học tập thông minh",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
      >
        <Suspense fallback={null}>
          <Providers>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </Providers>
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
