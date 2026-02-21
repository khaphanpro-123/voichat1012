"use client"

import { useState } from "react"

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

      // Debug: Log the response
      console.log('API Response:', data)
      console.log('Response type:', typeof data)
      console.log('Has flashcards:', Array.isArray(data?.flashcards))

      if (!response.ok) {
        if (response.status === 502) {
          setError("Backend đang khởi động. Vui lòng đợi 10 giây và thử lại...")
          return
        }
        throw new Error(data.error || `Upload failed: ${response.statusText}`)
      }

      // Validate response structure
      if (!data || typeof data !== 'object') {
        console.error('Invalid response:', data)
        throw new Error('Invalid response format from server')
      }

      // Check if response has expected fields
      if (!data.flashcards && !data.vocabulary) {
        console.error('Missing expected fields:', data)
        throw new Error('Response missing flashcards or vocabulary data')
      }

      setResult(data)
      
      handleSaveToDatabase(data).catch(err => console.error("Save error:", err))
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || "Có lỗi xảy ra khi upload")
    } finally {
      setUploading(false)
    }
  }

  const handleSaveToDatabase = async (data: any) => {
    if (!data || !Array.isArray(data.flashcards) || data.flashcards.length === 0) {
      console.warn('No flashcards to save')
      return
    }

    setSaving(true)
    try {
      const savePromises = data.flashcards.map(async (card: any) => {
        if (!card || (!card.word && !card.phrase)) {
          console.warn('Skipping invalid card:', card)
          return
        }

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

      if (data.knowledge_graph_stats || data.knowledge_graph) {
        await fetch("/api/knowledge-graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_id: data.document_id || Date.now().toString(),
            graph_data: data.knowledge_graph_stats || data.knowledge_graph,
          }),
        })
      }
    } catch (err) {
      console.error("Save error:", err)
    } finally {
      setSaving(false)
    }
  }

  const generateMarkmapLink = (graph: any) => {
    if (!graph || !graph.entities || !graph.relations) {
      console.warn('Invalid graph structure:', graph)
      return "#"
    }
    
    const connectionCount = new Map<string, number>()
    graph.relations.forEach((rel: any) => {
      connectionCount.set(rel.source, (connectionCount.get(rel.source) || 0) + 1)
      connectionCount.set(rel.target, (connectionCount.get(rel.target) || 0) + 1)
    })
    
    const sortedEntities = [...graph.entities].sort((a: any, b: any) => 
      (connectionCount.get(b.id) || 0) - (connectionCount.get(a.id) || 0)
    )
    
    const centerNode = sortedEntities[0]
    if (!centerNode) return "#"
    
    const childNodes = sortedEntities.slice(1, 13)
    
    let markdown = `# ${centerNode.label}\n\n`
    childNodes.forEach((node: any) => {
      markdown += `## ${node.label}\n`
    })
    
    const encoded = encodeURIComponent(markdown)
    return `https://markmap.js.org/repl#?d=${encoded}`
  }

  const generateMermaidLink = (graph: any) => {
    if (!graph || !graph.entities || !graph.relations) return "#"
    
    let mermaid = "graph TD\n"
    
    const entities = graph.entities.slice(0, 15)
    entities.forEach((entity: any, idx: number) => {
      const nodeId = `N${idx}`
      const label = entity.label.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 20)
      mermaid += `  ${nodeId}["${label}"]\n`
    })
    
    const relations = graph.relations.slice(0, 20)
    relations.forEach((rel: any) => {
      const sourceIdx = entities.findIndex((e: any) => e.id === rel.source)
      const targetIdx = entities.findIndex((e: any) => e.id === rel.target)
      if (sourceIdx >= 0 && targetIdx >= 0) {
        mermaid += `  N${sourceIdx} --> N${targetIdx}\n`
      }
    })
    
    const encoded = btoa(mermaid)
    return `https://mermaid.live/edit#pako:${encoded}`
  }

  const generateExcalidrawLink = (graph: any) => {
    if (!graph || !graph.entities || !graph.relations) return "#"
    
    const elements: any[] = []
    const entities = graph.entities.slice(0, 12)
    
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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <label
            htmlFor="file-upload"
            className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
          >
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
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
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Trích xuất từ vựng
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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

            {(result.knowledge_graph_stats || result.knowledge_graph) && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-bold text-lg mb-2">📊 Sơ đồ tư duy</h3>
                <div className="flex gap-4 mb-3">
                  <div className="px-4 py-2 bg-blue-100 rounded-lg">
                    <div className="text-2xl font-bold text-blue-700">
                      {result.knowledge_graph_stats?.entities?.length || result.knowledge_graph?.entities?.length || 0}
                    </div>
                    <div className="text-sm text-blue-600">Entities</div>
                  </div>
                  <div className="px-4 py-2 bg-green-100 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {result.knowledge_graph_stats?.relations?.length || result.knowledge_graph?.relations?.length || 0}
                    </div>
                    <div className="text-sm text-green-600">Relations</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-2">
                    🔗 Xem sơ đồ tư duy trực quan:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={generateMarkmapLink(result.knowledge_graph_stats || result.knowledge_graph)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      🗺️ Markmap (Interactive)
                    </a>
                    <a
                      href={generateMermaidLink(result.knowledge_graph_stats || result.knowledge_graph)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      📊 Mermaid (Flowchart)
                    </a>
                    <a
                      href={generateExcalidrawLink(result.knowledge_graph_stats || result.knowledge_graph)}
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

            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-3 text-lg">Danh sách từ vựng ({result.flashcards?.length || 0} từ):</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {Array.isArray(result.flashcards) && result.flashcards.map((card: any, idx: number) => {
                  if (!card || (!card.word && !card.phrase)) return null
                  
                  return (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-lg text-gray-800">{card.word || card.phrase}</p>
                          <button
                            onClick={() => speakText(card.word || card.phrase || "")}
                            className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                            title="Phát âm từ"
                          >
                            <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                          </button>
                        </div>

                        {card.phonetic && (
                          <p className="text-sm text-gray-600 mb-2">/{card.phonetic}/</p>
                        )}

                        {card.definition && (
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-semibold">📖 Nghĩa:</span> {card.definition}
                          </p>
                        )}

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
                                <svg className="h-4 w-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}

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

                      <div className="ml-4 text-right flex-shrink-0">
                        <div className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                          {(card.importance_score || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
