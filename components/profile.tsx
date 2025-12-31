"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    childName: "",
    gender: "",
    agechild: "",
    issuesofchild: "",
    issuesofparents: "",
    habits: "",
    area: "",
    nationality: "",
    ageofparents: "",
  });

  // Lấy dữ liệu profile từ API (không cần userId nữa)
  useEffect(() => {
    const fetchProfile = async () => {
      setLoadingData(true);
      setError(null);

      try {
        const res = await fetch("/api/profile/[userId]"); // ✅ backend tự đọc userId từ token
        if (!res.ok) {
          throw new Error(`Lỗi tải dữ liệu (${res.status})`);
        }

        const data = await res.json();
        setFormData({
          childName: data.childName || "",
          gender: data.gender || "",
          agechild: data.agechild?.toString() || "",
          issuesofchild: data.issuesofchild || "",
          issuesofparents: data.issuesofparents || "",
          habits: data.habits || "",
          area: data.area || "",
          nationality: data.nationality || "",
          ageofparents: data.ageofparents || "",
        });
      } catch (err: any) {
        setError(err.message || "Không thể tải dữ liệu");
      } finally {
        setLoadingData(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const res = await fetch("/api/profile/[userId]", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          agechild: Number(formData.agechild) || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Không thể lưu thông tin");
      }

      alert("✅ Cập nhật thành công!");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex justify-center mt-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg p-6 bg-white shadow-lg rounded-2xl"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">
          Thông tin cá nhân
        </h2>

        {loadingData && (
          <p className="text-sm text-gray-500 mb-2">⏳ Đang tải dữ liệu...</p>
        )}

        {error && <p className="text-sm text-red-500 mb-2">⚠️ {error}</p>}

        <input
          type="text"
          name="childName"
          value={formData.childName}
          onChange={handleChange}
          placeholder="Tên con"
          className="w-full mb-3 p-2 border rounded-lg"
        />

        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full mb-3 p-2 border rounded-lg"
        >
          <option value="">Chọn giới tính</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>

        <input
          type="number"
          name="agechild"
          value={formData.agechild}
          onChange={handleChange}
          placeholder="Tuổi của con"
          className="w-full mb-3 p-2 border rounded-lg"
        />

        <textarea
          name="issuesofchild"
          value={formData.issuesofchild}
          onChange={handleChange}
          placeholder="Vấn đề của con"
          className="w-full mb-3 p-2 border rounded-lg"
        />

        <textarea
          name="issuesofparents"
          value={formData.issuesofparents}
          onChange={handleChange}
          placeholder="Vấn đề của phụ huynh"
          className="w-full mb-3 p-2 border rounded-lg"
        />

        <textarea
          name="habits"
          value={formData.habits}
          onChange={handleChange}
          placeholder="Thói quen sinh hoạt"
          className="w-full mb-3 p-2 border rounded-lg"
        />

        <input
          type="text"
          name="area"
          value={formData.area}
          onChange={handleChange}
          placeholder="Khu vực sinh sống"
          className="w-full mb-3 p-2 border rounded-lg"
        />

        <input
          type="text"
          name="nationality"
          value={formData.nationality}
          onChange={handleChange}
          placeholder="Quốc tịch"
          className="w-full mb-3 p-2 border rounded-lg"
        />

        <input
          type="text"
          name="ageofparents"
          value={formData.ageofparents}
          onChange={handleChange}
          placeholder="Tuổi của phụ huynh"
          className="w-full mb-3 p-2 border rounded-lg"
        />

        <button
          type="submit"
          disabled={saving}
          className={`w-full p-2 rounded-lg text-white ${
            saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {saving ? "Đang lưu..." : "💾 Lưu thông tin"}
        </button>
      </form>
    </div>
  );
}
