"use client"

import { useState } from "react"
import { Upload, FileText, Loader2, CheckCircle, Volume2, Save } from "lucide-react"

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError("")
    }
  }

  const speakText = (text: string) => {
    if (typeof window === "undefined") return
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel() // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.rate = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleSaveToDatabase = async () => {
    if (!result || !result.flashcards) return

    setSaving(true)
    try {
      // Save each flashcard to vocabulary database
      const savePromises = result.flashcards.map(async (card: any) => {
        const response = await fetch("/api/vocabulary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: card.word || card.phrase,
            meaning: card.definition || "",
            vietnamese: card.definition || "",
            example: card.context_sentence?.replace(/<[^>]*>/g, "") || "",
            type: "document",
            level: card.importance_score > 0.7 ? "advanced" : card.importance_score > 0.4 ? "intermediate" : "beginner",
            pronunciation: card.phonetic || "",
            source: `document_${result.document_id || Date.now()}`,
          }),
        })
        return response.ok
      })

      await Promise.all(savePromises)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error("Save error:", err)
      setError("Không thể lưu vào database")
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Vui lòng chọn file")
      return
    }

    setUploading(true)
    setError("")
    setSaveSuccess(false)

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
        <p className="text-gray-600">Upload tài liệu để trích xuất từ vựng và tạo flashcards</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
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

          {saveSuccess && (
            <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
              ✅ Đã lưu {result.flashcards?.length} từ vào VietTalk!
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <h2 className="text-2xl font-bold">Kết quả</h2>
            </div>
            <button
              onClick={handleSaveToDatabase}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu vào VietTalk
                </>
              )}
            </button>
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

            {/* Vocabulary list with TTS */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-3 text-lg">Danh sách từ vựng:</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {result.flashcards?.map((card: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{card.word || card.phrase}</p>
                          <button
                            onClick={() => speakText(card.word || card.phrase)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Phát âm từ"
                          >
                            <Volume2 className="h-4 w-4 text-blue-600" />
                          </button>
                        </div>
                        {card.phonetic && (
                          <p className="text-sm text-gray-600 mt-1">/{card.phonetic}/</p>
                        )}
                        {card.definition && (
                          <p className="text-sm text-gray-700 mt-2">{card.definition}</p>
                        )}
                        {card.context_sentence && (
                          <div className="mt-2 flex items-start gap-2">
                            <p className="text-sm text-gray-600 italic flex-1">
                              "{card.context_sentence.replace(/<[^>]*>/g, '')}"
                            </p>
                            <button
                              onClick={() => speakText(card.context_sentence.replace(/<[^>]*>/g, ""))}
                              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                              title="Phát âm câu"
                            >
                              <Volume2 className="h-4 w-4 text-green-600" />
                            </button>
                          </div>
                        )}
                        {card.synonyms && card.synonyms.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {card.synonyms.map((syn: string, i: number) => (
                              <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {syn}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-sm font-medium text-gray-500">Điểm</div>
                        <div className="text-lg font-bold text-blue-600">
                          {(card.importance_score || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Knowledge Graph with SVG */}
            {result.knowledge_graph && (
              <KnowledgeGraphSVG graphData={result.knowledge_graph} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Simple SVG Knowledge Graph Component
function KnowledgeGraphSVG({ graphData }: { graphData: any }) {
  const entities = graphData.entities || []
  const relations = graphData.relations || []
  
  // Simple circular layout
  const centerX = 400
  const centerY = 300
  const radius = 200
  
  const nodes = entities.map((entity: any, idx: number) => {
    const angle = (idx / entities.length) * 2 * Math.PI
    return {
      ...entity,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  })

  const getNodeColor = (type: string) => {
    if (type === "cluster") return "#3b82f6"
    if (type === "phrase") return "#10b981"
    if (type === "word") return "#f59e0b"
    return "#6b7280"
  }

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold text-lg mb-3">Sơ đồ tư duy</h3>
      <div className="bg-gray-50 rounded-lg p-4">
        <svg width="800" height="600" className="mx-auto">
          {/* Draw edges */}
          {relations.map((rel: any, idx: number) => {
            const source = nodes.find((n: any) => n.id === rel.source)
            const target = nodes.find((n: any) => n.id === rel.target)
            if (!source || !target) return null
            
            return (
              <line
                key={`edge-${idx}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#cbd5e1"
                strokeWidth="2"
                opacity="0.6"
              />
            )
          })}
          
          {/* Draw nodes */}
          {nodes.map((node: any, idx: number) => (
            <g key={`node-${idx}`}>
              <circle
                cx={node.x}
                cy={node.y}
                r={15 + (node.importance || 0.5) * 15}
                fill={getNodeColor(node.type)}
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={node.x}
                y={node.y + 35}
                textAnchor="middle"
                fontSize="12"
                fill="#374151"
              >
                {node.label.length > 15 ? node.label.substring(0, 15) + "..." : node.label}
              </text>
            </g>
          ))}
        </svg>
        
        {/* Legend */}
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span>Cluster</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>Phrase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500" />
            <span>Word</span>
          </div>
        </div>
      </div>
    </div>
  )
}
