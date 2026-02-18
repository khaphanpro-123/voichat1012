"use client"

import { useState } from "react"
import { Upload, FileText, Loader2, CheckCircle, Volume2 } from "lucide-react"

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [saving, setSaving] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError("")
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
        if (response.status === 502) {
          setError("Backend đang khởi động. Vui lòng đợi 10 giây và thử lại...")
          return
        }
        throw new Error(data.error || `Upload failed: ${response.statusText}`)
      }

      setResult(data)
      
      // Auto-save to database
      handleSaveToDatabase(data).catch(err => console.error("Save error:", err))
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi upload")
    } finally {
      setUploading(false)
    }
  }

  const handleSaveToDatabase = async (data: any) => {
    if (!data.flashcards || data.flashcards.length === 0) return

    setSaving(true)
    try {
      // Save flashcards
      const savePromises = data.flashcards.map(async (card: any) => {
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

      // Save document metadata with mindmap links
      if (file) {
        const markmapLink = data.knowledge_graph ? generateMarkmapLink(data.knowledge_graph) : ""
        const mermaidLink = data.knowledge_graph ? generateMermaidLink(data.knowledge_graph) : ""
        const excalidrawLink = data.knowledge_graph ? generateExcalidrawLink(data.knowledge_graph) : ""

        await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: file.name,
            file_name: file.name,
            file_size: file.size,
            flashcard_count: data.flashcards?.length || 0,
            entity_count: data.knowledge_graph?.entities?.length || 0,
            relation_count: data.knowledge_graph?.relations?.length || 0,
            markmap_link: markmapLink,
            mermaid_link: mermaidLink,
            excalidraw_link: excalidrawLink,
            uploaded_by: "user", // TODO: Get from auth
          }),
        })
      }
    } catch (err) {
      console.error("Save error:", err)
    } finally {
      setSaving(false)
    }
  }

  // Generate Markmap link (markdown mindmap)
  const generateMarkmapLink = (graph: any) => {
    if (!graph.entities || !graph.relations) return "#"
    
    // Find center node (most connected)
    const connectionCount = new Map<string, number>()
    graph.relations.forEach((rel: any) => {
      connectionCount.set(rel.source, (connectionCount.get(rel.source) || 0) + 1)
      connectionCount.set(rel.target, (connectionCount.get(rel.target) || 0) + 1)
    })
    
    const sortedEntities = [...graph.entities].sort((a: any, b: any) => 
      (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0)
    )
    
    const centerNode = sortedEntities[0]
    const childNodes = sortedEntities.slice(1, 13)
    
    // Generate markdown
    let markdown = `# ${centerNode.label}\n\n`
    childNodes.forEach((node: any) => {
      markdown += `## ${node.label}\n`
    })
    
    // Encode and create Markmap link
    const encoded = encodeURIComponent(markdown)
    return `https://markmap.js.org/repl#?d=${encoded}`
  }

  // Generate Mermaid link (flowchart)
  const generateMermaidLink = (graph: any) => {
    if (!graph.entities || !graph.relations) return "#"
    
    // Generate Mermaid syntax
    let mermaid = "graph TD\n"
    
    // Add nodes (limit to 15 for readability)
    const entities = graph.entities.slice(0, 15)
    entities.forEach((entity: any, idx: number) => {
      const nodeId = `N${idx}`
      const label = entity.label.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 20)
      mermaid += `  ${nodeId}["${label}"]\n`
    })
    
    // Add relations (limit to 20)
    const relations = graph.relations.slice(0, 20)
    relations.forEach((rel: any) => {
      const sourceIdx = entities.findIndex((e: any) => e.id === rel.source)
      const targetIdx = entities.findIndex((e: any) => e.id === rel.target)
      if (sourceIdx >= 0 && targetIdx >= 0) {
        mermaid += `  N${sourceIdx} --> N${targetIdx}\n`
      }
    })
    
    // Encode and create Mermaid Live link
    const encoded = btoa(mermaid)
    return `https://mermaid.live/edit#pako:${encoded}`
  }

  // Generate Excalidraw link (JSON format)
  const generateExcalidrawLink = (graph: any) => {
    if (!graph.entities || !graph.relations) return "#"
    
    // Generate Excalidraw JSON
    const elements: any[] = []
    const entities = graph.entities.slice(0, 12)
    
    // Create nodes in circular layout
    const centerX = 400
    const centerY = 400
    const radius = 200
    
    entities.forEach((entity: any, idx: number) => {
      const angle = (idx / entities.length) * 2 * Math.PI
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      elements.push({
        type: "ellipse",
        x: x - 50,
        y: y - 30,
        width: 100,
        height: 60,
        strokeColor: "#1e40af",
        backgroundColor: "#dbeafe",
        fillStyle: "solid",
        strokeWidth: 2,
        id: `node-${idx}`,
      })
      
      elements.push({
        type: "text",
        x: x - 40,
        y: y - 10,
        width: 80,
        height: 20,
        text: entity.label.substring(0, 15),
        fontSize: 14,
        id: `text-${idx}`,
      })
    })
    
    const excalidrawData = {
      type: "excalidraw",
      version: 2,
      source: "voichat1012",
      elements: elements,
    }
    
    const encoded = encodeURIComponent(JSON.stringify(excalidrawData))
    return `https://excalidraw.com/#json=${encoded}`
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
              <p className="mb-2">❌ {error}</p>
              {(error.includes("502") || error.includes("khởi động")) && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  🔄 Thử lại
                </button>
              )}
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
              {saving && (
                <p className="text-green-600 mt-1 text-sm">
                  💾 Đang lưu vào database...
                </p>
              )}
            </div>

            {/* Knowledge Graph Stats */}
            {result.knowledge_graph && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-bold text-lg mb-2">📊 Sơ đồ tư duy</h3>
                <div className="flex gap-4 mb-3">
                  <div className="px-4 py-2 bg-blue-100 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {result.knowledge_graph.entities?.length || 0}
                    </div>
                    <div className="text-sm text-blue-600">Entities</div>
                  </div>
                  <div className="px-4 py-2 bg-green-100 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {result.knowledge_graph.relations?.length || 0}
                    </div>
                    <div className="text-sm text-green-600">Relations</div>
                  </div>
                </div>
                
                {/* Mindmap Links */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-2">
                    🔗 Xem sơ đồ tư duy trực quan:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={generateMarkmapLink(result.knowledge_graph)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      🗺️ Markmap (Interactive)
                    </a>
                    <a
                      href={generateMermaidLink(result.knowledge_graph)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      📊 Mermaid (Flowchart)
                    </a>
                    <a
                      href={generateExcalidrawLink(result.knowledge_graph)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      ✏️ Excalidraw (Draw)
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Vocabulary list - SHOW ALL */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-3 text-lg">Danh sách từ vựng ({result.flashcards?.length || 0} từ):</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {result.flashcards?.map((card: any, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Word with TTS */}
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-lg text-gray-800">{card.word || card.phrase}</p>
                          <button
                            onClick={() => speakText(card.word || card.phrase || "")}
                            className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                            title="Phát âm từ"
                          >
                            <Volume2 className="h-4 w-4 text-blue-600" />
                          </button>
                        </div>

                        {/* Phonetic */}
                        {card.phonetic && (
                          <p className="text-sm text-gray-600 mb-2">/{card.phonetic}/</p>
                        )}

                        {/* Definition */}
                        {card.definition && (
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-semibold">📖 Nghĩa:</span> {card.definition}
                          </p>
                        )}

                        {/* Context Sentence */}
                        {card.context_sentence && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2">
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-gray-700 italic flex-1">
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
                          <div className="flex flex-wrap gap-1 mt-2">
                            <span className="text-xs font-semibold text-gray-600">🔄 Từ đồng nghĩa:</span>
                            {card.synonyms.map((syn: string, i: number) => (
                              <span
                                key={i}
                                className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full border border-purple-200"
                              >
                                {syn}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Score Badge */}
                      <div className="ml-4 text-right flex-shrink-0">
                        <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                          {(card.importance_score || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
