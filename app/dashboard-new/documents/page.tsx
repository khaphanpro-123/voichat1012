"use client"

import { useState, useEffect, useRef } from "react"
import { Upload, FileText, Loader2, CheckCircle, Volume2, Save, Maximize2 } from "lucide-react"

interface Flashcard {
  word?: string
  phrase?: string
  phonetic?: string
  definition?: string
  context_sentence?: string
  synonyms?: string[]
  importance_score?: number
}

interface KnowledgeGraph {
  entities?: Array<{ id: string; label: string; type: string }>
  relations?: Array<{ source: string; target: string; type: string }>
}

interface UploadResult {
  flashcards?: Flashcard[]
  knowledge_graph?: KnowledgeGraph
  document_id?: string
}

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    setResult(null)

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

      const data = await response.json()

      if (!response.ok) {
        // Handle 502 error (backend cold start)
        if (response.status === 502) {
          setError("Backend đang khởi động. Vui lòng đợi 10 giây và thử lại...")
          return
        }
        
        throw new Error(data.error || `Upload failed: ${response.statusText}`)
      }

      setResult(data)
      
      // Auto-save to database (don't block on errors)
      handleSaveToDatabase(data).catch(err => {
        console.error("Save error:", err)
        // Don't show error to user, data is already displayed
      })
    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err.message || "Có lỗi xảy ra khi upload")
    } finally {
      setUploading(false)
    }
  }

  const handleSaveToDatabase = async (data: UploadResult) => {
    if (!data.flashcards || data.flashcards.length === 0) return

    setSaving(true)
    try {
      // Save flashcards
      const savePromises = data.flashcards.map(async (card) => {
        const level = (card.importance_score || 0) > 0.7 ? "advanced" : 
                     (card.importance_score || 0) > 0.4 ? "intermediate" : "beginner"
        
        await fetch("/api/vocabulary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: card.word || card.phrase,
            meaning: card.definition || "",
            example: card.context_sentence || "",
            level: level,
            pronunciation: card.phonetic || "",
            source: `document_${data.document_id || Date.now()}`,
            synonyms: card.synonyms || [],
          }),
        })
      })

      await Promise.all(savePromises)
      
      // Save knowledge graph
      if (data.knowledge_graph) {
        await fetch("/api/knowledge-graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: data.document_id || Date.now().toString(),
            graph_data: data.knowledge_graph,
          }),
        })
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error("Save error:", err)
    } finally {
      setSaving(false)
    }
  }

  const speakText = (text: string) => {
    if (typeof window === "undefined") return
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.rate = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }

  // Draw mindmap graph using Canvas API
  useEffect(() => {
    if (!result?.knowledge_graph || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { entities = [], relations = [] } = result.knowledge_graph

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = 600

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (entities.length === 0) return

    // Find central keyword (most connected)
    const connectionCount = new Map<string, number>()
    relations.forEach(rel => {
      connectionCount.set(rel.source, (connectionCount.get(rel.source) || 0) + 1)
      connectionCount.set(rel.target, (connectionCount.get(rel.target) || 0) + 1)
    })

    const sortedEntities = [...entities].sort((a, b) => 
      (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0)
    )

    const centerNode = sortedEntities[0]
    const childNodes = sortedEntities.slice(1, 13) // Limit to 12 child nodes

    // Center position
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 200

    // Draw connections first (behind nodes)
    ctx.strokeStyle = "#cbd5e1"
    ctx.lineWidth = 2
    childNodes.forEach((node, i) => {
      const angle = (i / childNodes.length) * 2 * Math.PI
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.stroke()
    })

    // Draw center node
    ctx.fillStyle = "#3b82f6"
    ctx.beginPath()
    ctx.arc(centerX, centerY, 50, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 14px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    const centerLabel = centerNode.label.length > 15 
      ? centerNode.label.substring(0, 15) + "..." 
      : centerNode.label
    ctx.fillText(centerLabel, centerX, centerY)

    // Draw child nodes
    childNodes.forEach((node, i) => {
      const angle = (i / childNodes.length) * 2 * Math.PI
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      // Node circle
      ctx.fillStyle = "#10b981"
      ctx.beginPath()
      ctx.arc(x, y, 35, 0, 2 * Math.PI)
      ctx.fill()

      // Node label
      ctx.fillStyle = "#ffffff"
      ctx.font = "12px sans-serif"
      const label = node.label.length > 12 
        ? node.label.substring(0, 12) + "..." 
        : node.label
      ctx.fillText(label, x, y)
    })

  }, [result])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Tài liệu & Từ vựng
          </h1>
          <p className="text-gray-600">Upload tài liệu để trích xuất từ vựng và tạo sơ đồ tư duy</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <div className="space-y-4">
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center w-full h-40 border-3 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-300"
            >
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-blue-500 mb-3" />
                <p className="text-lg font-medium text-gray-700">
                  {file ? file.name : "Click để chọn file PDF/DOCX"}
                </p>
                <p className="text-sm text-gray-500 mt-1">Hỗ trợ PDF, DOCX, DOC</p>
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
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <p className="text-sm mb-2">❌ {error}</p>
                {error.includes("502") || error.includes("khởi động") ? (
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
                  >
                    🔄 Thử lại
                  </button>
                ) : null}
              </div>
            )}

            {saveSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                ✅ Đã lưu vào database thành công!
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl font-medium text-lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <FileText className="h-6 w-6" />
                  Trích xuất từ vựng
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">
            {/* Success Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <h2 className="text-2xl font-bold text-green-800">Trích xuất thành công!</h2>
                  <p className="text-green-700 mt-1">
                    Đã tìm thấy {result.flashcards?.length || 0} từ vựng và lưu vào database
                  </p>
                </div>
              </div>
            </div>

            {/* Knowledge Graph Mindmap */}
            {result.knowledge_graph && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Maximize2 className="h-6 w-6 text-purple-600" />
                    Sơ đồ tư duy (Mindmap)
                  </h3>
                  <div className="flex gap-4 text-sm">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {result.knowledge_graph.entities?.length || 0} Entities
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      {result.knowledge_graph.relations?.length || 0} Relations
                    </span>
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  className="w-full border border-gray-200 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50"
                  style={{ height: "600px" }}
                />
                <p className="text-sm text-gray-500 mt-3 text-center">
                  💡 Keyword chính ở giữa (màu xanh dương), các từ liên quan xung quanh (màu xanh lá)
                </p>
              </div>
            )}

            {/* Vocabulary Cards */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                Danh sách từ vựng ({result.flashcards?.length || 0} từ)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[800px] overflow-y-auto pr-2">
                {result.flashcards?.map((card, idx) => (
                  <div
                    key={idx}
                    className="group relative bg-gradient-to-br from-white to-blue-50 border border-gray-200 rounded-xl p-5 hover:shadow-xl hover:border-blue-300 transition-all duration-300"
                  >
                    {/* Score Badge */}
                    <div className="absolute top-3 right-3 px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-bold shadow-lg">
                      {(card.importance_score || 0).toFixed(2)}
                    </div>

                    {/* Word/Phrase */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-bold text-gray-800">
                          {card.word || card.phrase}
                        </h4>
                        <button
                          onClick={() => speakText(card.word || card.phrase || "")}
                          className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                          title="Phát âm từ"
                        >
                          <Volume2 className="h-5 w-5 text-blue-600" />
                        </button>
                      </div>
                      {card.phonetic && (
                        <p className="text-sm text-gray-600 mt-1 font-mono">
                          /{card.phonetic}/
                        </p>
                      )}
                    </div>

                    {/* Definition */}
                    {card.definition && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700 mb-1">📖 Nghĩa:</p>
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {card.definition}
                        </p>
                      </div>
                    )}

                    {/* Context Sentence */}
                    {card.context_sentence && (
                      <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <p className="text-sm text-gray-700 italic leading-relaxed flex-1">
                            "{card.context_sentence.replace(/<[^>]*>/g, '')}"
                          </p>
                          <button
                            onClick={() => speakText(card.context_sentence?.replace(/<[^>]*>/g, '') || "")}
                            className="p-1 hover:bg-yellow-100 rounded-full transition-colors flex-shrink-0"
                            title="Phát âm câu"
                          >
                            <Volume2 className="h-4 w-4 text-yellow-700" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Synonyms */}
                    {card.synonyms && card.synonyms.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">🔄 Từ đồng nghĩa:</p>
                        <div className="flex flex-wrap gap-2">
                          {card.synonyms.map((syn, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200 hover:shadow-md transition-shadow"
                            >
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
