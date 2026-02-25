"use client"

import { useState } from "react"
import dynamic from 'next/dynamic'

// Use Next.js dynamic import for client-side only component
const SimpleMindmap = dynamic(
  () => import('@/components/SimpleMindmap'),
  { 
    ssr: false,
    loading: () => <div className="p-8 text-center text-gray-500">Đang tải sơ đồ...</div>
  }
)

export default function DocumentsPage() {
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

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from server')
      }

      if (!data.flashcards && !data.vocabulary) {
        throw new Error('Response missing flashcards or vocabulary data')
      }

      setResult(data)
      
      // Auto-save vocabulary to database
      await handleSaveToDatabase(data)
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi upload")
    } finally {
      setUploading(false)
    }
  }

  const handleSaveToDatabase = async (data: any) => {
    try {
      const vocabularyToSave = data.vocabulary || data.flashcards || []
      
      if (vocabularyToSave.length === 0) return

      const savePromises = vocabularyToSave.map(async (item: any) => {
        if (!item || (!item.word && !item.phrase)) return

        const level = (item.importance_score || 0) > 0.7 ? "advanced" : 
                     (item.importance_score || 0) > 0.4 ? "intermediate" : "beginner"
        
        await fetch("/api/vocabulary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: item.word || item.phrase,
            meaning: item.definition || "",
            example: item.context_sentence || item.supporting_sentence || "",
            level: level,
            pronunciation: item.phonetic || item.ipa || "",
            ipa: item.phonetic || item.ipa || "",
            source: `document_${data.document_id || Date.now()}`,
            synonyms: item.synonyms || [],
          }),
        })
      })

      await Promise.all(savePromises)
    } catch (err) {
      console.error("Save error:", err)
    }
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
          <h2 className="text-2xl font-bold mb-4">Kết quả trích xuất</h2>
          
          <div className="space-y-4">
            {/* Mindmap Section */}
            {(result.knowledge_graph_stats || result.knowledge_graph) && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-bold text-lg mb-3">📊 Sơ đồ tư duy</h3>
                
                <SimpleMindmap 
                  entities={(result.knowledge_graph_stats || result.knowledge_graph)?.entities || []}
                  relations={(result.knowledge_graph_stats || result.knowledge_graph)?.relations || []}
                />
              </div>
            )}

            {/* Vocabulary List */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-3 text-lg">
                📚 Danh sách từ vựng ({(result.vocabulary || result.flashcards)?.length || 0} từ)
              </h3>
              <div className="space-y-3">
                {Array.isArray(result.vocabulary || result.flashcards) && 
                 (result.vocabulary || result.flashcards).map((card: any, idx: number) => {
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

                        {(card.phonetic || card.ipa) && (
                          <p className="text-sm text-blue-600 mb-2 font-mono">
                            /{card.phonetic || card.ipa}/
                          </p>
                        )}

                        {card.definition && (
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-semibold">📖 Nghĩa:</span> {card.definition}
                          </p>
                        )}

                        {(card.context_sentence || card.supporting_sentence) && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2">
                            <div className="flex items-start gap-2">
                              <p className="text-sm text-gray-700 italic flex-1">
                                "{(card.context_sentence || card.supporting_sentence).replace(/<[^>]*>/g, '')}"
                              </p>
                              <button
                                onClick={() => speakText((card.context_sentence || card.supporting_sentence)?.replace(/<[^>]*>/g, '') || "")}
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
