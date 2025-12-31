import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Mic, BookOpen, Trophy } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      icon: UserPlus,
      title: "Đăng ký tài khoản",
      description: "Tạo tài khoản miễn phí và làm bài khảo sát để xác định trình độ tiếng Anh của bạn.",
      step: "01",
    },
    {
      icon: Mic,
      title: "Luyện nói thực tế",
      description: "Trò chuyện như với một người bạn thật. Hệ thống sẽ sửa lỗi ngữ pháp và phát âm cho bạn.",
      step: "02",
    },
    {
      icon: BookOpen,
      title: "Học từ vựng thông minh",
      description: "Upload tài liệu hoặc hình ảnh để trích xuất từ vựng. Học qua flashcard với phương pháp lặp lại ngắt quãng.",
      step: "03",
    },
    {
      icon: Trophy,
      title: "Theo dõi tiến trình",
      description: "Xem thống kê học tập, duy trì streak hàng ngày và đạt được các mục tiêu của bạn.",
      step: "04",
    },
  ];

  return (
    <section className="py-20 lg:py-32 bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground mb-4 animate-fade-in-up">
            Bắt đầu học trong 4 bước
          </h2>
          <p
            className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Quy trình học tiếng Anh đơn giản, hiệu quả với phương pháp học tập thông minh.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card
                className="w-full text-center p-6 border-none shadow-lg rounded-2xl 
                           transform transition-all duration-300 hover:scale-105 hover:shadow-2xl 
                           bg-white dark:bg-gray-800"
              >
                <CardContent className="flex flex-col items-center pt-4">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-primary/10">
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 
                                    bg-primary text-primary-foreground w-10 h-10 rounded-full 
                                    flex items-center justify-center text-lg font-bold shadow-md">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-base">{step.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
