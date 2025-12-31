import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Heart, UserPlus, Calendar, Brain, FileText } from "lucide-react";

// Mảng dữ liệu cho các bước
const steps = [
  {
    icon: UserPlus,
    title: "Đăng ký tài khoản",
    description: "Tạo tài khoản và thêm thông tin cơ bản về trẻ của bạn một cách dễ dàng và nhanh chóng.",
    step: "01",
  },
  {
    icon: Calendar,
    title: "Thực hiện đánh giá hàng ngày",
    description: "Hoàn thành các bài test ngắn, thú vị về hành vi và phát triển của trẻ mỗi ngày.",
    step: "02",
  },
  {
    icon: Brain,
    title: "Phân tích dữ liệu thông minh",
    description: "Hệ thống sẽ tự động phân tích dữ liệu để đưa ra đánh giá chính xác.",
    step: "03",
  },
  {
    icon: FileText,
    title: "Nhận kết quả và hướng dẫn",
    description: "Xem báo cáo chi tiết, nhận các bài tập cá nhân hóa và tư vấn từ chuyên gia.",
    step: "04",
  },
];

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      {/* Video nền */}
       {/* Video nền */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/video_register.mp4" type="video/mp4" />
      </video>

      {/* Lớp phủ (Overlay) */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* Container chứa nội dung chính */}
      <div className="relative z-20 w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-stretch">
        {/* Cột trái: Sơ đồ 4 bước theo chiều dọc */}
        <div className="hidden md:flex flex-col items-center justify-center p-6 rounded-lg bg-background/80 shadow-xl border border-border">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-foreground">Quy trình 4 bước đơn giản</h2>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
              Bắt đầu hành trình đồng hành cùng con với một quy trình khoa học, hiệu quả và hoàn toàn tự động.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 w-full">
            {steps.map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-green-500 text-white font-bold text-xl ring-4 ring-green-100 dark:ring-green-900 shadow-lg">
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cột phải: Khung đăng ký */}
        <div className="flex flex-col justify-center">
          <Card className="w-full h-full bg-background/80">
            <CardHeader className="text-center">
              <Link href="/" className="md:hidden inline-flex items-center space-x-2 mb-4">
                <Heart className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold text-foreground">L2-BRAIN</span>
              </Link>
              <CardTitle className="text-2xl">Đăng ký tài khoản</CardTitle>
              <CardDescription>Tạo tài khoản để bắt đầu học tiếng Anh</CardDescription>
            </CardHeader>
            <CardContent className="h-full flex flex-col justify-between">
              <RegisterForm />
              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground">
                  Đã có tài khoản?{" "}
                  <Link href="/auth/login" className="text-primary hover:underline">
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}