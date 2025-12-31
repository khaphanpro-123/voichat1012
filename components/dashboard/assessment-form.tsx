"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, ArrowLeft, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

const assessmentQuestions = [
  {
    id: 1,
    category: "Giao tiếp xã hội",
    question: "Trẻ có nhìn vào mắt bạn khi bạn nói chuyện không?",
    options: [
      { value: "0", label: "Không bao giờ", score: 0 },
      { value: "1", label: "Hiếm khi", score: 1 },
      { value: "2", label: "Thỉnh thoảng", score: 2 },
      { value: "3", label: "Thường xuyên", score: 3 },
    ],
  },
  {
    id: 2,
    category: "Giao tiếp xã hội",
    question: "Trẻ có phản ứng khi được gọi tên không?",
    options: [
      { value: "0", label: "Không phản ứng", score: 0 },
      { value: "1", label: "Hiếm khi phản ứng", score: 1 },
      { value: "2", label: "Thỉnh thoảng phản ứng", score: 2 },
      { value: "3", label: "Luôn phản ứng", score: 3 },
    ],
  },
  {
    id: 3,
    category: "Hành vi lặp lại",
    question: "Trẻ có thực hiện các động tác lặp lại (vỗ tay, lắc người) không?",
    options: [
      { value: "3", label: "Không bao giờ", score: 3 },
      { value: "2", label: "Hiếm khi", score: 2 },
      { value: "1", label: "Thỉnh thoảng", score: 1 },
      { value: "0", label: "Thường xuyên", score: 0 },
    ],
  },
  {
    id: 4,
    category: "Tương tác xã hội",
    question: "Trẻ có chơi cùng với trẻ khác không?",
    options: [
      { value: "0", label: "Không bao giờ", score: 0 },
      { value: "1", label: "Hiếm khi", score: 1 },
      { value: "2", label: "Thỉnh thoảng", score: 2 },
      { value: "3", label: "Thường xuyên", score: 3 },
    ],
  },
  {
    id: 5,
    category: "Ngôn ngữ",
    question: "Trẻ có sử dụng cử chỉ để giao tiếp (chỉ tay, vẫy tay) không?",
    options: [
      { value: "0", label: "Không bao giờ", score: 0 },
      { value: "1", label: "Hiếm khi", score: 1 },
      { value: "2", label: "Thỉnh thoảng", score: 2 },
      { value: "3", label: "Thường xuyên", score: 3 },
    ],
  },
]

export function AssessmentForm() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const progress = ((currentQuestion + 1) / assessmentQuestions.length) * 100

  const handleAnswer = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (currentQuestion < assessmentQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    // Tính điểm
    const totalScore = Object.entries(answers).reduce((sum, [questionId, value]) => {
      const question = assessmentQuestions.find((q) => q.id === Number.parseInt(questionId))
      const option = question?.options.find((opt) => opt.value === value)
      return sum + (option?.score || 0)
    }, 0)

    const maxScore = assessmentQuestions.reduce(
      (sum, q) => sum + Math.max(...q.options.map((opt) => opt.score)),
      0
    )
    const percentage = Math.round((totalScore / maxScore) * 100)

    const assessmentResult = {
      date: new Date().toISOString(),
      answers,
      totalScore,
      maxScore,
      percentage,
      timestamp: Date.now(),
    }

    try {
      // Gửi API backend để lưu MongoDB
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessmentResult),
      })

      if (!res.ok) {
        throw new Error("API lưu thất bại")
      }
    } catch (err) {
      console.error("API lỗi, fallback lưu sessionStorage", err)

      // fallback sessionStorage

      if (typeof window !== "undefined") {
        const existingAssessments = JSON.parse(sessionStorage
.getItem("assessments") || "[]")
        existingAssessments.push(assessmentResult)
        sessionStorage
.setItem("assessments", JSON.stringify(existingAssessments))
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))

    router.push("/dashboard/assessment/complete")
    setIsSubmitting(false)
  }

  const currentQ = assessmentQuestions[currentQuestion]
  const isLastQuestion = currentQuestion === assessmentQuestions.length - 1
  const hasAnswer = answers[currentQ.id] !== undefined

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tiến trình</span>
            <span className="text-sm text-muted-foreground">
              {currentQuestion + 1}/{assessmentQuestions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <div className="bg-primary/10 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-primary">{currentQ.category}</span>
            </div>
          </div>
          <CardTitle className="text-xl">{currentQ.question}</CardTitle>
          <CardDescription>
            Chọn đáp án phù hợp nhất với tình trạng của trẻ trong tuần qua.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQ.id] || ""}
            onValueChange={(value) => handleAnswer(currentQ.id, value)}
          >
            {currentQ.options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem
                  value={option.value}
                  id={`${currentQ.id}-${option.value}`}
                />
                <Label
                  htmlFor={`${currentQ.id}-${option.value}`}
                  className="flex-1 cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrevious} disabled={currentQuestion === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Câu trước
        </Button>

        {isLastQuestion ? (
          <Button onClick={handleSubmit} disabled={!hasAnswer || isSubmitting}>
            {isSubmitting ? (
              "Đang lưu..."
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Hoàn thành
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!hasAnswer}>
            Câu tiếp theo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
