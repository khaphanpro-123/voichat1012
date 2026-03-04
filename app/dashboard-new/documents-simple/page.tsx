"use client"

import { useState } from "react"

// Vocabulary Card Component
function VocabularyCard({ card, speakText }: { card: any; speakText: (text: string) => void }) {
  if (!card || (!card.word && !card.phrase)) return null;
  
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-bold text-lg text-gray-800">{card.word || card.phrase}</p>
            
            {/* POS Tag - Always show */}
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200 font-medium">
              {card.pos_label || 'noun'}
            </span>
            
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

          {/* IPA - Always show if available */}
          {(card.phonetic || card.ipa) && (
            <p className="text-sm text-blue-600 mb-2 font-mono">
              {card.phonetic || card.ipa}
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
}

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [maxPhrases, setMaxPhrases] = useState(40)
  const [maxWords, setMaxWords] = useState(10)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024 // 50MB
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
      formData.append("max_phrases", maxPhrases.toString())
      formData.append("max_words", maxWords.toString())
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
        if (response.status === 413) {
          setError("File quá lớn (tối đa 50MB). Vui lòng chọn file nhỏ hơn")
          return
        }
        if (response.status === 504) {
          setError("Xử lý quá lâu. File có thể quá lớn hoặc phức tạp. Vui lòng thử file nhỏ hơn")
          return
        }
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

      // DEBUG: Log response data structure
      console.log("📊 Backend response:", data)
      console.log("📊 Vocabulary items:", data.vocabulary?.length || 0)
      console.log("📊 First vocabulary item:", data.vocabulary?.[0])
      console.log("📊 IPA field check:", {
        hasPhonetic: !!data.vocabulary?.[0]?.phonetic,
        hasIpa: !!data.vocabulary?.[0]?.ipa,
        phoneticValue: data.vocabulary?.[0]?.phonetic,
        ipaValue: data.vocabulary?.[0]?.ipa
      })

      setResult(data)
      
      // Auto-save vocabulary to database
      console.log("💾 Starting auto-save to database...")
      const saveResult = await handleSaveToDatabase(data)
      console.log("✅ Auto-save completed:", saveResult)
      
      // Show success message to user
      if (saveResult && saveResult.savedCount > 0) {
        // You can add a toast notification here if you have a toast library
        console.log(`✅ Đã tự động lưu ${saveResult.savedCount} từ vào kho từ vựng`)
      }
    } catch (err: any) {
      console.error("Upload error:", err)
      // Hiển thị thông báo lỗi chung
      setError("Hệ thống xử lý tài liệu đã xảy ra lỗi, vui lòng tải tệp khác")
    } finally {
      setUploading(false)
    }
  }

  const handleSaveToDatabase = async (data: any) => {
    try {
      const vocabularyToSave = data.vocabulary || data.flashcards || []
      
      console.log("💾 Vocabulary to save:", vocabularyToSave.length, "items")
      
      if (vocabularyToSave.length === 0) {
        console.log("⚠️ No vocabulary to save")
        return { savedCount: 0, failedCount: 0 }
      }

      let savedCount = 0
      let failedCount = 0
      const errors: string[] = []

      const savePromises = vocabularyToSave.map(async (item: any, index: number) => {
        if (!item || (!item.word && !item.phrase)) {
          console.log(`⚠️ Skipping item ${index}: no word/phrase`)
          return
        }

        const level = (item.importance_score || 0) > 0.7 ? "advanced" : 
                     (item.importance_score || 0) > 0.4 ? "intermediate" : "beginner"
        
        const payload = {
          word: item.word || item.phrase,
          meaning: item.definition || "",
          example: item.context_sentence || item.supporting_sentence || "",
          level: level,
          pronunciation: item.phonetic || item.ipa || "",
          ipa: item.ipa || item.phonetic || "",
          source: `document_${data.document_id || Date.now()}`,
          synonyms: item.synonyms || [],
        }

        // DEBUG: Log first item
        if (index === 0) {
          console.log("💾 First item payload:", payload)
          console.log("💾 IPA check:", {
            hasPhonetic: !!item.phonetic,
            hasIpa: !!item.ipa,
            phoneticValue: item.phonetic,
            ipaValue: item.ipa,
            finalIpa: payload.ipa
          })
        }
        
        try {
          const response = await fetch("/api/vocabulary", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          
          if (!response.ok) {
            failedCount++
            const errorText = await response.text()
            const errorMsg = `Failed to save word: ${item.word || item.phrase} - ${errorText}`
            errors.push(errorMsg)
            console.error(`❌ ${errorMsg}`)
          } else {
            savedCount++
            if (index === 0) {
              const result = await response.json()
              console.log("✅ First item saved successfully:", result)
            }
          }
        } catch (err: any) {
          failedCount++
          const errorMsg = `Error saving word: ${item.word || item.phrase} - ${err.message}`
          errors.push(errorMsg)
          console.error(`❌ ${errorMsg}`)
        }
      })

      await Promise.all(savePromises)
      
      console.log(`✅ Save complete: ${savedCount} saved, ${failedCount} failed`)
      
      if (errors.length > 0 && errors.length <= 5) {
        console.error("❌ Errors:", errors)
      }
      
      // Show user notification
      if (savedCount > 0) {
        console.log(`✅ Đã lưu ${savedCount} từ vào kho từ vựng`)
      }
      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} từ không lưu được`)
      }
      
      return { savedCount, failedCount }
    } catch (err) {
      console.error("❌ Save error:", err)
      return { savedCount: 0, failedCount: 0 }
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tài liệu & Từ vựng</h1>
          <p className="text-gray-600">Upload tài liệu để trích xuất từ vựng</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = '/dashboard-new'}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Trang chủ
          </button>
          <button
            onClick={() => window.location.href = '/dashboard-new/vocabulary'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Xem từ vựng đã lưu
          </button>
        </div>
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
                {file ? (
                  <span>
                    {file.name}
                    <span className="block text-xs text-gray-500 mt-1">
                      ({(file.size / 1024 / 1024).toFixed(2)}MB)
                    </span>
                  </span>
                ) : (
                  "Click để chọn file PDF/DOCX (tối đa 50MB)"
                )}
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

          {/* Tùy chọn số lượng từ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số cụm từ (phrases)
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={maxPhrases}
                onChange={(e) => setMaxPhrases(parseInt(e.target.value) || 40)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Mặc định: 40</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số từ đơn (words)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={maxWords}
                onChange={(e) => setMaxWords(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Mặc định: 10</p>
            </div>
          </div>
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            💡 Tổng số từ vựng sẽ trích xuất: <span className="font-bold text-blue-600">{maxPhrases + maxWords}</span> từ
          </div>

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
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Trích xuất từ vựng
              </span>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Kết quả trích xuất</h2>
          
          <div className="space-y-4">
            {/* Statistics Summary */}
            {result.vocabulary_by_difficulty && (
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {result.vocabulary_by_difficulty.critical?.length || 0}
                  </div>
                  <div className="text-xs text-red-700 font-medium">🔴 Rất quan trọng</div>
                  <div className="text-xs text-gray-500">0.8 - 1.0</div>
                </div>
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {result.vocabulary_by_difficulty.important?.length || 0}
                  </div>
                  <div className="text-xs text-orange-700 font-medium">🟠 Quan trọng</div>
                  <div className="text-xs text-gray-500">0.6 - 0.79</div>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {result.vocabulary_by_difficulty.moderate?.length || 0}
                  </div>
                  <div className="text-xs text-yellow-700 font-medium">🟡 Trung bình</div>
                  <div className="text-xs text-gray-500">0.4 - 0.59</div>
                </div>
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.vocabulary_by_difficulty.easy?.length || 0}
                  </div>
                  <div className="text-xs text-green-700 font-medium">🟢 Dễ</div>
                  <div className="text-xs text-gray-500">0.0 - 0.39</div>
                </div>
              </div>
            )}

            {/* Vocabulary List - Grouped by Difficulty */}
            <div className="border rounded-lg p-4">
              <h3 className="font-bold mb-3 text-lg">
                📚 Danh sách từ vựng ({(result.vocabulary || result.flashcards)?.length || 0} từ)
              </h3>
              
              {result.vocabulary_by_difficulty ? (
                <div className="space-y-6">
                  {/* Critical - Rất quan trọng */}
                  {result.vocabulary_by_difficulty.critical?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-red-300">
                        <h4 className="text-lg font-bold text-red-600">
                          🔴 Rất Quan Trọng
                        </h4>
                        <span className="text-sm text-red-500">
                          ({result.vocabulary_by_difficulty.critical.length} từ)
                        </span>
                      </div>
                      <div className="space-y-3">
                        {result.vocabulary_by_difficulty.critical.map((card: any, idx: number) => (
                          <VocabularyCard key={`critical-${idx}`} card={card} speakText={speakText} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Important - Quan trọng */}
                  {result.vocabulary_by_difficulty.important?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-orange-300">
                        <h4 className="text-lg font-bold text-orange-600">
                          🟠 Quan Trọng
                        </h4>
                        <span className="text-sm text-orange-500">
                          ({result.vocabulary_by_difficulty.important.length} từ)
                        </span>
                      </div>
                      <div className="space-y-3">
                        {result.vocabulary_by_difficulty.important.map((card: any, idx: number) => (
                          <VocabularyCard key={`important-${idx}`} card={card} speakText={speakText} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Moderate - Trung bình */}
                  {result.vocabulary_by_difficulty.moderate?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-yellow-300">
                        <h4 className="text-lg font-bold text-yellow-600">
                          🟡 Trung Bình
                        </h4>
                        <span className="text-sm text-yellow-500">
                          ({result.vocabulary_by_difficulty.moderate.length} từ)
                        </span>
                      </div>
                      <div className="space-y-3">
                        {result.vocabulary_by_difficulty.moderate.map((card: any, idx: number) => (
                          <VocabularyCard key={`moderate-${idx}`} card={card} speakText={speakText} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Easy - Dễ */}
                  {result.vocabulary_by_difficulty.easy?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-green-300">
                        <h4 className="text-lg font-bold text-green-600">
                          🟢 Dễ
                        </h4>
                        <span className="text-sm text-green-500">
                          ({result.vocabulary_by_difficulty.easy.length} từ)
                        </span>
                      </div>
                      <div className="space-y-3">
                        {result.vocabulary_by_difficulty.easy.map((card: any, idx: number) => (
                          <VocabularyCard key={`easy-${idx}`} card={card} speakText={speakText} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Fallback: Display flat list if grouping not available
                <div className="space-y-3">
                  {Array.isArray(result.vocabulary || result.flashcards) && 
                   (result.vocabulary || result.flashcards).map((card: any, idx: number) => (
                    <VocabularyCard key={idx} card={card} speakText={speakText} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
