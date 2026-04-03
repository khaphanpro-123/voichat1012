"use client"

import { useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"

function VocabularyCard({ card, speakText }: { card: any; speakText: (text: string) => void }) {
  if (!card || (!card.word && !card.phrase)) return null

  const isPrimarySynonym = card.is_primary_synonym !== false
  const similarityScore = card.similarity_to_primary

  return (
    <div className={`p-4 rounded-lg border ${
      isPrimarySynonym
        ? "bg-white border-gray-200"
        : "bg-gray-50 border-gray-200 ml-4"
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <p className="font-semibold text-lg text-gray-900 break-words">
            {card.word || card.phrase}
          </p>
          <button
            onClick={() => speakText(card.word || card.phrase || "")}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
            title="Phát âm"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
        </div>
        <div className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold flex-shrink-0">
          {(card.importance_score || card.final_score || 0).toFixed(2)}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <span className="text-sm bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
          {card.pos_label || "noun"}
        </span>
        {!isPrimarySynonym && similarityScore && (
          <span className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
            {(similarityScore * 100).toFixed(0)}% tương đồng
          </span>
        )}
      </div>

      {card.definition && (
        <p className="text-base text-gray-700 mb-2">
          <span className="font-medium text-gray-900">Nghĩa:</span> {card.definition}
        </p>
      )}

      {(card.context_sentence || card.supporting_sentence) && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-2">
          <div className="flex items-start gap-2">
            <p className="text-base text-gray-600 italic flex-1">
              "{(card.context_sentence || card.supporting_sentence).replace(/<[^>]*>/g, "")}"
            </p>
            <button
              onClick={() => speakText((card.context_sentence || card.supporting_sentence)?.replace(/<[^>]*>/g, "") || "")}
              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
              title="Phát âm câu"
            >
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {card.synonyms && card.synonyms.length > 0 && (
        <div>
          <span className="text-sm font-medium text-gray-600">Từ đồng nghĩa: </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {card.synonyms.map((syn: string, i: number) => (
              <span key={i} className="text-sm bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                {syn}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const PREVIEW_LIMIT = 8

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [maxPhrases, setMaxPhrases] = useState(40)
  const [maxWords, setMaxWords] = useState(10)
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set())

  const toggleTopic = (index: number) => {
    setExpandedTopics(prev => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      const maxSize = 50 * 1024 * 1024
      if (selectedFile.size > maxSize) {
        setError(`File quá lớn (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB). Vui lòng chọn file nhỏ hơn 50MB`)
        return
      }
      setFile(selectedFile)
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
    if (!file) { setError("Vui lòng chọn file"); return }
    setUploading(true)
    setError("")
    setResult(null)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", file.name)
      formData.append("max_phrases", maxPhrases.toString())
      formData.append("max_words", maxWords.toString())
      formData.append("min_phrase_length", "2")
      formData.append("max_phrase_length", "5")
      formData.append("bm25_weight", "0.2")
      formData.append("generate_flashcards", "true")

      const response = await fetch(`/api/upload-document-complete`, { method: "POST", body: formData })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 413) { setError("File quá lớn (tối đa 50MB)"); return }
        if (response.status === 504) { setError("Xử lý quá lâu. Vui lòng thử file nhỏ hơn"); return }
        if (response.status === 502) { setError("Backend đang khởi động. Vui lòng đợi 10 giây và thử lại..."); return }
        throw new Error(data.error || `Upload failed: ${response.statusText}`)
      }
      if (!data || typeof data !== "object") throw new Error("Invalid response format")
      if (!data.flashcards && !data.vocabulary) throw new Error("Response missing vocabulary data")

      setResult(data)
      if (data.topics && data.topics.length > 0) {
        try { localStorage.setItem("recent_topics", JSON.stringify(data.topics)) } catch {}
      }
      await handleSaveToDatabase(data)
    } catch (err: any) {
      setError("Hệ thống xử lý tài liệu đã xảy ra lỗi, vui lòng tải tệp khác")
    } finally {
      setUploading(false)
    }
  }

  const handleSaveToDatabase = async (data: any) => {
    try {
      const vocabularyToSave = data.vocabulary || data.flashcards || []
      if (vocabularyToSave.length === 0) return { savedCount: 0, failedCount: 0 }
      let savedCount = 0, failedCount = 0
      const savePromises = vocabularyToSave.map(async (item: any) => {
        if (!item || (!item.word && !item.phrase)) return
        const payload = {
          word: item.word || item.phrase,
          meaning: item.definition || "",
          example: item.context_sentence || item.supporting_sentence || "",
          level: (item.importance_score || 0) > 0.7 ? "advanced" : (item.importance_score || 0) > 0.4 ? "intermediate" : "beginner",
          pronunciation: item.phonetic || item.ipa || "",
          ipa: item.ipa || item.phonetic || "",
          partOfSpeech: item.pos_label || "other",
          type: item.pos_label || "other",
          source: "document",
          synonyms: item.synonyms || [],
        }
        if (!payload.word?.trim()) { failedCount++; return }
        try {
          const res = await fetch("/api/vocabulary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          if (res.ok) savedCount++; else failedCount++
        } catch { failedCount++ }
      })
      await Promise.all(savePromises)
      return { savedCount, failedCount }
    } catch {
      return { savedCount: 0, failedCount: 0 }
    }
  }

  return (
    <DashboardLayout>
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Tài liệu & Từ vựng</h1>
            <p className="text-base text-gray-500 mt-0.5">Upload tài liệu để trích xuất từ vựng</p>
          </div>
          <button
            onClick={() => window.location.href = "/dashboard-new/vocabulary"}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base font-medium transition-colors"
          >
            Từ vựng đã lưu
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <svg className="h-7 w-7 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-base text-gray-600">
              {file ? (
                <span className="font-medium text-gray-800">{file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)</span>
              ) : (
                "Chọn file PDF / DOCX (tối đa 50MB)"
              )}
            </p>
            <input id="file-upload" type="file" className="hidden" accept=".pdf,.docx,.doc" onChange={handleFileChange} />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">Số cụm từ</label>
              <input
                type="number" min="10" max="100" value={maxPhrases}
                onChange={(e) => setMaxPhrases(parseInt(e.target.value) || 40)}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">Số từ đơn</label>
              <input
                type="number" min="0" max="50" value={maxWords}
                onChange={(e) => setMaxWords(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <p className="text-base text-gray-500">
            Tổng từ vựng sẽ trích xuất: <span className="font-semibold text-gray-800">{maxPhrases + maxWords}</span> từ
          </p>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-base border border-red-200">
              {error}
              {(error.includes("502") || error.includes("khởi động")) && (
                <button onClick={handleUpload} disabled={uploading} className="mt-2 block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-base font-medium">
                  Thử lại
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-base font-semibold transition-colors"
          >
            {uploading ? "Đang xử lý..." : "Trích xuất từ vựng"}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-5">

            {/* Stats */}
            {result.vocabulary_by_difficulty && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "critical", label: "Rất quan trọng", range: "0.8–1.0", color: "border-red-300 bg-red-50 text-red-700" },
                  { key: "important", label: "Quan trọng", range: "0.6–0.79", color: "border-orange-300 bg-orange-50 text-orange-700" },
                  { key: "moderate", label: "Trung bình", range: "0.4–0.59", color: "border-yellow-300 bg-yellow-50 text-yellow-700" },
                  { key: "easy", label: "Dễ", range: "0.0–0.39", color: "border-green-300 bg-green-50 text-green-700" },
                ].map(({ key, label, range, color }) => (
                  <div key={key} className={`border-2 rounded-xl p-3 text-center ${color}`}>
                    <div className="text-2xl font-bold">{result.vocabulary_by_difficulty[key]?.length || 0}</div>
                    <div className="text-sm font-medium mt-0.5">{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{range}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Topics - Accordion layout */}
            {result.topics && result.topics.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Section header - always visible, click to collapse all */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Chủ đề ({result.topics.length})
                  </h2>
                </div>

                {/* Accordion items */}
                <div className="divide-y divide-gray-100">
                  {result.topics.map((topic: any, index: number) => {
                    const phrases = topic.items?.filter((item: any) => item.type === "phrase") || []
                    const words = topic.items?.filter((item: any) => item.type === "word") || []
                    const allItems = [...phrases, ...words]
                    const isExpanded = expandedTopics.has(index)
                    const topicName = topic.topic_name || topic.topic_label
                    return (
                      <div key={index}>
                        {/* Accordion header - always visible */}
                        <button
                          onClick={() => toggleTopic(index)}
                          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {topicName || `Chủ đề ${index + 1}`}
                            </span>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded flex-shrink-0">
                              {allItems.length} từ
                            </span>
                          </div>
                          <svg
                            className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Accordion body - only when expanded */}
                        {isExpanded && (
                          <div className="px-5 pb-4 space-y-3">
                            {topic.core_phrase && (
                              <p className="text-xs text-gray-500">
                                Từ khóa: <span className="font-medium text-gray-700">{topic.core_phrase}</span>
                              </p>
                            )}
                            {phrases.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1.5">Cụm từ</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {phrases.map((item: any, i: number) => (
                                    <span key={i} className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded border border-green-200">
                                      {item.word || item.phrase || item.term}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {words.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1.5">Từ đơn</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {words.map((item: any, i: number) => (
                                    <span key={i} className="text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded border border-blue-200">
                                      {item.word || item.phrase || item.term}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Vocabulary List */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Danh sách từ vựng ({(result.vocabulary || result.flashcards)?.length || 0} từ)
              </h2>

              {result.vocabulary_by_difficulty ? (
                <div className="space-y-6">
                  {[
                    { key: "critical", label: "Rất Quan Trọng", borderColor: "border-red-400", textColor: "text-red-600" },
                    { key: "important", label: "Quan Trọng", borderColor: "border-orange-400", textColor: "text-orange-600" },
                    { key: "moderate", label: "Trung Bình", borderColor: "border-yellow-400", textColor: "text-yellow-600" },
                    { key: "easy", label: "Dễ", borderColor: "border-green-400", textColor: "text-green-600" },
                  ].map(({ key, label, borderColor, textColor }) =>
                    result.vocabulary_by_difficulty[key]?.length > 0 ? (
                      <div key={key}>
                        <div className={`flex items-center gap-3 mb-3 pb-2 border-b-2 ${borderColor}`}>
                          <h3 className={`text-lg font-semibold ${textColor}`}>{label}</h3>
                          <span className={`text-base ${textColor}`}>({result.vocabulary_by_difficulty[key].length} từ)</span>
                        </div>
                        <div className="space-y-3">
                          {result.vocabulary_by_difficulty[key].map((card: any, idx: number) => (
                            <VocabularyCard key={`${key}-${idx}`} card={card} speakText={speakText} />
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(result.vocabulary || result.flashcards) &&
                    (result.vocabulary || result.flashcards).map((card: any, idx: number) => (
                      <VocabularyCard key={idx} card={card} speakText={speakText} />
                    ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
    </DashboardLayout>
  )
}
