import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Heart } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Video nền */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/video_login.mp4" type="video/mp4" />
      </video>

      {/* Overlay tối để chữ rõ hơn */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Khung nội dung */}
      <div className="relative z-10 w-full max-w-2xl p-4">
        <Card className="w-full">
          <CardHeader className="text-center">
            <Link href="/" className="md:hidden inline-flex items-center space-x-2 mb-4">
              <Heart className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">L2-BRAIN</span>
            </Link>
            <CardTitle className="text-2xl">Đăng nhập</CardTitle>
            <CardDescription>
              Đăng nhập để tiếp tục học tiếng Anh
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                Chưa có tài khoản?{" "}
                <Link href="/auth/register" className="text-primary hover:underline">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
