"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface DailyLogFormProps {
  childId: string;
}
export default function DailyLogForm({ childId }: DailyLogFormProps) {
  const [form, setForm] = useState({
    mood: "Bình thường",
    sleepHours: 8,
    eating: "",
    communication: "",
    activities: "",
    therapyNotes: "",
    specialBehavior: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Lấy token đã lưu ở sessionStorage khi login
      const token = typeof window !== "undefined" ? sessionStorage.getItem("token") : null;
      if (!token) {
        toast.error("Bạn cần đăng nhập lại");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/daily-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ thêm dòng này
        },
        body: JSON.stringify({ ...form }),
      });

      if (!res.ok) throw new Error("Lỗi khi lưu nhật ký");
      toast.success("Lưu nhật ký thành công!");
      setForm({
        mood: "Bình thường",
        sleepHours: 8,
        eating: "",
        communication: "",
        activities: "",
        therapyNotes: "",
        specialBehavior: "",
      });
    } catch (err: any) {
      toast.error(err.message || "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };



  return (
    <Card className="rounded-3xl shadow-lg border-none">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-blue-600">Nhật ký hằng ngày</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Tâm trạng */}
          <div>
            <label className="block mb-2 font-medium">Tâm trạng hôm nay</label>
            <Select
              value={form.mood}
              onValueChange={(val) => handleChange("mood", val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn tâm trạng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bình thường">Bình thường</SelectItem>
                <SelectItem value="Vui vẻ">Vui vẻ</SelectItem>
                <SelectItem value="Mệt mỏi">Mệt mỏi</SelectItem>
                <SelectItem value="Căng thẳng">Căng thẳng</SelectItem>
                <SelectItem value="Khác">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Giấc ngủ */}
          <div>
            <label className="block mb-2 font-medium">Giờ ngủ (tiếng)</label>
            <div className="flex items-center gap-4">
              <Slider
                min={0}
                max={12}
                step={0.5}
                value={[form.sleepHours]}
                onValueChange={(val) => handleChange("sleepHours", val[0])}
                className="flex-1"
              />
              <span className="w-12 text-center font-semibold">{form.sleepHours}h</span>
            </div>
          </div>

          {/* Ăn uống */}
          <div>
            <label className="block mb-2 font-medium">Ăn uống</label>
            <Textarea
              value={form.eating}
              onChange={(e) => handleChange("eating", e.target.value)}
              placeholder="Mô tả thói quen ăn uống trong ngày..."
            />
          </div>

          {/* Giao tiếp */}
          <div>
            <label className="block mb-2 font-medium">Giao tiếp</label>
            <Textarea
              value={form.communication}
              onChange={(e) => handleChange("communication", e.target.value)}
              placeholder="Trẻ có giao tiếp với gia đình / bạn bè / giáo viên không..."
            />
          </div>

          {/* Hoạt động */}
          <div>
            <label className="block mb-2 font-medium">Hoạt động</label>
            <Textarea
              value={form.activities}
              onChange={(e) => handleChange("activities", e.target.value)}
              placeholder="Các hoạt động trong ngày..."
            />
          </div>

          {/* Ghi chú trị liệu */}
          <div>
            <label className="block mb-2 font-medium">Ghi chú trị liệu</label>
            <Textarea
              value={form.therapyNotes}
              onChange={(e) => handleChange("therapyNotes", e.target.value)}
              placeholder="Ghi chú từ buổi trị liệu (nếu có)..."
            />
          </div>

          {/* Hành vi đặc biệt */}
          <div>
            <label className="block mb-2 font-medium">Hành vi đặc biệt</label>
            <Textarea
              value={form.specialBehavior}
              onChange={(e) => handleChange("specialBehavior", e.target.value)}
              placeholder="Ghi lại hành vi đặc biệt / bất thường..."
            />
          </div>

          <div className="text-right">
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : "Lưu nhật ký"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
