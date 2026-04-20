"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Calendar, TrendingUp, ArrowRight } from "lucide-react"
import Link from "next/link"

export function AssessmentComplete() {
  const [assessmentCount, setAssessmentCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAssessments() {
      try {
        const res = await fetch("/api/assessments", { method: "GET" })
        if (!res.ok) throw new Error("Failed to fetch assessments")

        const data = await res.json()
        // ví dụ API trả về { count: 2 }
        setAssessmentCount(data.count)
      } catch (error) {
        console.error(" Lỗi khi tải dữ liệu đánh giá:", error)
        setAssessmentCount(0) // fallback
      } finally {
        setLoading(false)
      }
    }

    fetchAssessments()
  }, [])

  const canViewResults = (assessmentCount ?? 0) >= 3

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      <div className="flex justify-center">
        <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-full">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Hoàn thành đánh giá!
        </h1>
        <p className="text-xl text-muted-foreground">
          Cảm ơn bạn đã hoàn thành bài đánh giá hôm nay. Dữ liệu đã được lưu và sẽ được phân tích bởi hệ thống AI.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Tiến trình của bạn</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            {loading ? (
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            ) : (
              <>
                <div className="text-4xl font-bold text-primary">
                  {assessmentCount}/3
                </div>
                <p className="text-muted-foreground">Ngày đánh giá đã hoàn thành</p>

                {canViewResults ? (
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <p className="text-green-800 dark:text-green-200 font-medium mb-2">
                       Bạn đã đủ dữ liệu để xem kết quả phân tích AI!
                    </p>
                    <Link href="/dashboard/results">
                      <Button>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Xem kết quả phân tích
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <p className="text-orange-800 dark:text-orange-200 font-medium">
                      Cần thêm {3 - (assessmentCount ?? 0)} ngày đánh giá để có kết quả phân tích chính xác
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard">
          <Button variant="outline" className="w-full bg-transparent">
            Về trang chủ
          </Button>
        </Link>
        <Link href="/dashboard/resources">
          <Button variant="outline" className="w-full bg-transparent">
            Xem tài nguyên hỗ trợ
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <Card className="text-left">
        <CardHeader>
          <CardTitle className="text-lg">Lời nhắc quan trọng</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Kết quả đánh giá chỉ mang tính chất tham khảo</li>
            <li>• Không thay thế cho chẩn đoán y khoa chuyên nghiệp</li>
            <li>• Hãy tiếp tục theo dõi và đánh giá hàng ngày</li>
            <li>• Liên hệ bác sĩ nếu có bất kỳ lo ngại nào</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
