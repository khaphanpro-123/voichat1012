"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";
import { useKeenSlider } from "keen-slider/react";
import { useEffect } from "react";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Phan Văn Kha",
      role: "Sinh viên, Cần Thơ",
      content:
        "Mình đã học tiếng Anh nhiều năm nhưng không dám nói. Với L2-BRAIN, mình có thể luyện nói bất cứ lúc nào. Sau 3 tháng, mình đã tự tin giao tiếp hơn rất nhiều!",
      rating: 5,
    },
    {
      name: "Hoàng Nam",
      role: "Nhân viên văn phòng, TP.HCM",
      content:
        "Tính năng Voice Chat thật sự tuyệt vời! AI sửa lỗi ngữ pháp rất tự nhiên, không làm mình cảm thấy xấu hổ. Giờ mình có thể họp online bằng tiếng Anh tự tin hơn.",
      rating: 5,
    },
    {
      name: "Thu Hà",
      role: "Giáo viên, Đà Nẵng",
      content:
        "Học từ vựng qua hình ảnh rất hiệu quả! Mình upload ảnh và AI tự động trích xuất từ vựng với nghĩa tiếng Việt. Tiết kiệm rất nhiều thời gian.",
      rating: 5,
    },
    {
      name: "Đức Anh",
      role: "Học sinh cấp 3, Vĩnh Long",
      content:
        "App giúp mình chuẩn bị IELTS Speaking rất tốt. Mình có thể luyện nói mọi lúc mọi nơi và nhận feedback ngay lập tức.",
      rating: 5,
    },
  ];

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: {
      perView: 1,
      spacing: 16,
    },
    breakpoints: {
      "(min-width: 768px)": {
        slides: { perView: 2, spacing: 24 },
      },
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      instanceRef.current?.next();
    }, 5000);
    return () => clearInterval(interval);
  }, [instanceRef]);

  return (
    <section className="py-20 lg:py-32 bg-background dark:bg-gray-950 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground mb-4">
            Học viên nói gì về chúng tôi
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hàng nghìn người Việt đã cải thiện tiếng Anh với L2-BRAIN.
          </p>
        </div>

        <div className="relative">
          <div ref={sliderRef} className="keen-slider w-full overflow-hidden">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="keen-slider__slide w-full max-w-full flex-shrink-0"
              >
                <Card className="w-full h-full border-none rounded-2xl shadow-lg bg-white dark:bg-gray-800">
                  <CardContent className="flex flex-col justify-between h-full w-full p-6">
                    <div className="flex items-start mb-4">
                      <Quote className="h-8 w-8 text-primary/30 flex-shrink-0" />
                      <div className="flex ml-2">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-5 w-5 fill-yellow-400 text-yellow-400"
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-foreground text-base md:text-lg mb-6 italic leading-relaxed flex-grow">
                      &ldquo;{testimonial.content}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          {testimonial.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
