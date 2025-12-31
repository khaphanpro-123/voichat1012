import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BarChart3, Phone, BookOpen, Users, AlertTriangle, CheckCircle } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: Calendar,
      title: "Đánh giá hàng ngày",
      description: "Theo dõi phát triển của trẻ qua các bài test ngắn, dễ thực hiện hàng ngày.",
      color: "text-blue-500", // Màu sắc tinh tế hơn
      bg: "bg-blue-50", // Nền biểu tượng
    },
    {
      icon: BarChart3,
      title: "Phân tích AI thông minh",
      description: "Thuật toán học máy phân tích dữ liệu và đưa ra đánh giá nguy cơ chính xác.",
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      icon: Phone,
      title: "Liên hệ khẩn cấp",
      description: "Danh sách bác sĩ chuyên khoa và hotline hỗ trợ 24/7 khi cần thiết.",
      color: "text-red-500",
      bg: "bg-red-50",
    },
    {
      icon: BookOpen,
      title: "Tài nguyên học tập",
      description: "Thư viện bài viết, video hướng dẫn và tài liệu từ các chuyên gia.",
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      icon: Users,
      title: "Cộng đồng hỗ trợ",
      description: "Kết nối với các gia đình khác và chia sẻ kinh nghiệm, động viên lẫn nhau.",
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
    {
      icon: CheckCircle,
      title: "Theo dõi tiến trình",
      description: "Dashboard trực quan hiển thị sự phát triển và cải thiện của trẻ theo thời gian.",
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      <div className="container mx-auto px-4 relative">
        {/* Decorative background elements */}
        <div className="absolute top-1/4 left-0 w-48 h-48 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-1/4 right-0 w-48 h-48 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>

        <div className="text-center mb-16 relative z-10">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-6 leading-tight">
            Học tiếng Anh thông minh với AI
          </h2>
          <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto opacity-90">
            Hệ thống L2-BRAIN được xây dựng với tâm huyết, cung cấp giải pháp toàn diện để người Việt học tiếng Anh hiệu quả nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="bg-white dark:bg-gray-800 border-none rounded-xl shadow-lg
                         transform hover:scale-105 hover:shadow-xl transition-all duration-300 ease-in-out
                         flex flex-col items-start p-6 text-left animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="p-0 mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${feature.bg} bg-opacity-70 dark:bg-opacity-30`}>
                  <feature.icon className={`h-8 w-8 ${feature.color}`} strokeWidth={2} />
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-grow">
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-20 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900 dark:to-orange-800
                        rounded-2xl p-8 md:p-12 shadow-2xl border border-yellow-200 dark:border-yellow-700 relative z-10
                        transform hover:-translate-y-1 transition-transform duration-300 ease-in-out animate-fade-in animation-delay-600">
          <div className="flex flex-col md:flex-row items-center justify-center text-center md:text-left">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-full flex-shrink-0 mb-6 md:mb-0 md:mr-8 shadow-inner">
              <AlertTriangle className="h-10 w-10 text-yellow-600 dark:text-yellow-400" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">Lưu ý quan trọng từ L2-BRAIN</h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 max-w-4xl mx-auto">
                Để có được <strong className="text-yellow-700 dark:text-yellow-300">kết quả học tập tốt nhất</strong>, hãy{" "}
                <strong className="text-yellow-700 dark:text-yellow-300">luyện tập đều đặn mỗi ngày</strong>. Hệ thống AI sẽ theo dõi tiến trình và đưa ra gợi ý phù hợp với trình độ của bạn.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}