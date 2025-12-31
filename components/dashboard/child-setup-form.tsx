"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"

export function ChildSetupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    childName: "",
    birthDate: "",
    gender: "",
    currentConcerns: "",
    previousAssessments: "",
  })
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("/api/child/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error("API error")
      }

      const data = await res.json()
      console.log("Saved child info:", data)

      // Nếu API thành công → chuyển dashboard
      router.replace("/dashboard")
    } catch (error) {
      console.error("Lỗi khi lưu thông tin:", error)

      // fallback: lưu sessionStorage
      sessionStorage.setItem("childInfo", JSON.stringify(formData))
      router.push("/dashboard")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin trẻ em</CardTitle>
        <CardDescription>
          Thông tin này sẽ giúp chúng tôi tùy chỉnh các bài đánh giá phù hợp với độ tuổi và đặc điểm của trẻ.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="childName">Tên trẻ *</Label>
              <Input
                id="childName"
                placeholder="Nguyễn Văn A"
                value={formData.childName}
                onChange={(e) => setFormData((prev) => ({ ...prev, childName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Ngày sinh *</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, birthDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Giới tính *</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn giới tính" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Nam</SelectItem>
                <SelectItem value="female">Nữ</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentConcerns">Mối quan tâm hiện tại</Label>
            <Textarea
              id="currentConcerns"
              placeholder="Ví dụ: Trẻ ít giao tiếp, không chơi với bạn bè, có hành vi lặp lại..."
              value={formData.currentConcerns}
              onChange={(e) => setFormData((prev) => ({ ...prev, currentConcerns: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="previousAssessments">Đánh giá trước đây (nếu có)</Label>
            <Textarea
              id="previousAssessments"
              placeholder="Mô tả các đánh giá, chẩn đoán hoặc can thiệp mà trẻ đã từng trải qua..."
              value={formData.previousAssessments}
              onChange={(e) => setFormData((prev) => ({ ...prev, previousAssessments: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">Lưu ý quan trọng:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Thông tin này được bảo mật tuyệt đối</li>
              <li>• Bạn có thể cập nhật thông tin bất cứ lúc nào</li>
              <li>• Kết quả đánh giá chỉ mang tính chất tham khảo</li>
              <li>• Luôn tham khảo ý kiến bác sĩ chuyên khoa</li>
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Đang lưu thông tin..." : "Hoàn thành thiết lập"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
