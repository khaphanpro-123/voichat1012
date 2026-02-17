"use client"

import { useState, useEffect, Suspense } from "react"
import { Upload, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import dynamic from "next/dynamic"

// Dynamically import components to avoid SSR issues
const FlashcardViewer = dynamic(() => import("@/components/flashcard-viewer-wrapper"), {
  ssr: false,
  loading: () => (
    <Card>
      <CardContent className="p-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
        <p className="text-muted-foreground">Đang tải flashcards...</p>
      </CardContent>
    </Card>
  ),
})

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        "https://voichat1012-production.up.railway.app"
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tài liệu & Từ vựng</h1>
          <p className="text-muted-foreground">
            Upload tài liệu để trích xuất từ vựng và tạo flashcards
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
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
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Trích xuất từ vựng
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {mounted && result && (
        <Suspense fallback={
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Đang tải kết quả...</p>
            </CardContent>
          </Card>
        }>
          <Card>
            <CardHeader>
              <CardTitle>Flashcards ({result.flashcards?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <FlashcardViewer flashcards={result.flashcards || []} />
            </CardContent>
          </Card>
          
          {/* Knowledge Graph - Temporarily disabled */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Sơ đồ tư duy</span>
                <Badge variant="secondary">Đang phát triển</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">
                  Tính năng visualization đang được cập nhật
                </p>
                {result.knowledge_graph && (
                  <div className="text-sm text-left max-w-md mx-auto">
                    <p className="font-medium mb-2">Dữ liệu có sẵn:</p>
                    <ul className="space-y-1 text-muted-foreground">
                      <li>• {result.knowledge_graph.entities?.length || 0} entities</li>
                      <li>• {result.knowledge_graph.relations?.length || 0} relations</li>
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Suspense>
      )}
    </div>
  )
}
