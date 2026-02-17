"use client"

import { useState } from "react"
import { Upload, FileText, Loader2, CheckCircle } from "lucide-react"

export default function DocumentsSimplePage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError("")
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Vui lòng chọn file")
      return
    }

    setUploading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", file.name)
      formData.append("max_phrases", "40")
      formData.append("min_phrase_length", "2")
      formData.append("max_phrase_length", "5")
      formData.append("bm25_weight", "0.2")
      formData.append("generate_flashcards", "true")

      const response = await fetch(`/api/upload-document-complete`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi upload")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tài liệu & Từ vựng</h1>
        <p className="text-gray-600">Upload tài liệu để trích xuất từ vựng</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
          >
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                {file ? file.name : "Click để chọn file PDF/DOCX"}
              </p>
            </div>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
            />
          </label>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                Trích xuất từ vựng
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h2 className="text-2xl font-bold">Kết quả</h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Đã trích xuất thành công!
              </p>
              <p className="text-green-700 mt-2">
                Số từ vựng: {result.flashcards?.length || 0}
              </p>
            </div>

            {/* Simple list of vocabulary */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-3">Danh sách từ vựng:</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.flashcards?.slice(0, 10).map((card: any, idx: number) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded">
                    <p className="font-medium">{card.word || card.phrase}</p>
                    {card.phonetic && (
                      <p className="text-sm text-gray-600">/{card.phonetic}/</p>
                    )}
                    <p className="text-sm text-gray-500">
                      Điểm: {(card.importance_score || 0).toFixed(2)}
                    </p>
                  </div>
                ))}
                {result.flashcards?.length > 10 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    ... và {result.flashcards.length - 10} từ khác
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
