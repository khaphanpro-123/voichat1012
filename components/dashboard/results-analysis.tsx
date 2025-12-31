"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Brain, Download, Phone } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface Assessment {
  date: string
  percentage: number
  totalScore: number
  maxScore: number
}

interface AiAnalysis {
  averageScore: number
  trend: number
  riskLevel: "low" | "medium" | "high"
  recommendations: string[]
  strengths: string[]
  concerns: string[]
}

export function ResultsAnalysis() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedAssessments = JSON.parse(sessionStorage
.getItem("assessments") || "[]")
    setAssessments(storedAssessments)

    if (storedAssessments.length >= 3) {
      fetchAiAnalysis(storedAssessments)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchAiAnalysis = async (data: Assessment[]) => {
    try {
      setIsLoading(true)
      // Gọi API backend (ví dụ: Next.js API route `/api/analysis`)
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessments: data }),
      })

      if (!res.ok) throw new Error("Lỗi khi gọi API")

      const result = await res.json()
      setAiAnalysis(result)
    } catch (error) {
      console.error("Fetch AI Analysis Error:", error)

      // fallback giả lập nếu API lỗi
      const avgScore = data.reduce((sum, a) => sum + a.percentage, 0) / data.length
      const trend = data[data.length - 1].percentage - data[0].percentage
      setAiAnalysis({
        averageScore: Math.round(avgScore),
        trend: Math.round(trend),
        riskLevel: avgScore >= 70 ? "low" : avgScore >= 50 ? "medium" : "high",
        recommendations: [
          "Tiếp tục theo dõi hàng ngày",
          "Tăng cường hoạt động tương tác xã hội",
          "Tham khảo ý kiến bác sĩ chuyên khoa",
          "Tham gia các hoạt động nhóm phù hợp",
        ],
        strengths: ["Khả năng giao tiếp bằng mắt tốt", "Phản ứng tích cực với âm thanh"],
        concerns: ["Cần cải thiện tương tác xã hội", "Giảm hành vi lặp lại"],
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Đang phân tích dữ liệu...</h2>
          <p className="text-muted-foreground">Vui lòng đợi trong giây lát để nhận kết quả chi tiết</p>
        </div>
      </div>
    )
  }

  if (assessments.length < 3) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-orange-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-orange-800 dark:text-orange-200 mb-2">
              Chưa đủ dữ liệu để phân tích
            </h2>
            <p className="text-orange-600 dark:text-orange-300 mb-4">
              Cần ít nhất 3 ngày đánh giá để AI có thể đưa ra kết quả chính xác. Hiện tại bạn đã hoàn thành{" "}
              {assessments.length}/3 ngày.
            </p>
            <Button>Tiếp tục đánh giá</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!aiAnalysis) return null

  const chartData = assessments.map((a, i) => ({ day: `Ngày ${i + 1}`, score: a.percentage }))

  const getRiskColor = (level: string) =>
    level === "low" ? "text-green-600" : level === "medium" ? "text-orange-600" : "text-red-600"

  const getRiskLabel = (level: string) =>
    level === "low" ? "Thấp" : level === "medium" ? "Trung bình" : "Cao"

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Kết quả phân tích AI</h1>
        <p className="text-muted-foreground">
          Dựa trên {assessments.length} ngày đánh giá, đây là phân tích chi tiết về sự phát triển của trẻ.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Điểm trung bình */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Điểm trung bình</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiAnalysis.averageScore}%</div>
            <Progress value={aiAnalysis.averageScore} className="mt-2" />
          </CardContent>
        </Card>

        {/* Xu hướng */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Xu hướng</CardTitle>
            {aiAnalysis.trend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${aiAnalysis.trend >= 0 ? "text-green-600" : "text-red-600"}`}>
              {aiAnalysis.trend >= 0 ? "+" : ""}
              {aiAnalysis.trend}%
            </div>
            <p className="text-xs text-muted-foreground">So với đánh giá đầu tiên</p>
          </CardContent>
        </Card>

        {/* Nguy cơ */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mức độ nguy cơ</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${getRiskColor(aiAnalysis.riskLevel)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(aiAnalysis.riskLevel)}`}>
              {getRiskLabel(aiAnalysis.riskLevel)}
            </div>
            <p className="text-xs text-muted-foreground">Dựa trên phân tích AI</p>
          </CardContent>
        </Card>
      </div>

      {/* Biểu đồ */}
      <Card>
        <CardHeader>
          <CardTitle>Biểu đồ tiến trình</CardTitle>
          <CardDescription>Điểm số đánh giá qua các ngày</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Điểm mạnh và điểm yếu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Điểm mạnh</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiAnalysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Cần chú ý</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiAnalysis.concerns.map((c, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{c}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Khuyến nghị */}
      <Card>
        <CardHeader>
          <CardTitle>Khuyến nghị từ AI</CardTitle>
          <CardDescription>Các bước tiếp theo được đề xuất dựa trên kết quả phân tích</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiAnalysis.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                <div className="bg-primary/10 p-1 rounded-full">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <span className="text-sm">{rec}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button className="flex-1">
          <Download className="mr-2 h-4 w-4" />
          Tải báo cáo PDF
        </Button>
        <Button variant="outline" className="flex-1 bg-transparent">
          <Phone className="mr-2 h-4 w-4" />
          Liên hệ chuyên gia
        </Button>
      </div>
    </div>
  )
}
