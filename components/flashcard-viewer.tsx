"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Volume2, ChevronLeft, ChevronRight, Star } from "lucide-react"

interface Flashcard {
  word: string
  phrase?: string
  importance_score: number
  phonetic?: string
  context_sentence?: string
  synonyms?: string[]
  definition?: string
  example?: string
}

interface FlashcardViewerProps {
  flashcards: Flashcard[]
}

export default function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sort flashcards by importance score (descending)
  const sortedFlashcards = [...flashcards].sort(
    (a, b) => (b.importance_score || 0) - (a.importance_score || 0)
  )

  const currentCard = sortedFlashcards[currentIndex]

  const handleNext = () => {
    setFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % sortedFlashcards.length)
  }

  const handlePrev = () => {
    setFlipped(false)
    setCurrentIndex(
      (prev) => (prev - 1 + sortedFlashcards.length) % sortedFlashcards.length
    )
  }

  const handleFlip = () => {
    setFlipped(!flipped)
  }

  const speakText = (text: string) => {
    if (typeof window === "undefined") return
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.rate = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }

  const getImportanceColor = (score: number) => {
    if (score >= 0.8) return "text-red-500"
    if (score >= 0.6) return "text-orange-500"
    if (score >= 0.4) return "text-yellow-500"
    return "text-green-500"
  }

  const getImportanceStars = (score: number) => {
    const stars = Math.round(score * 5)
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ))
  }

  if (!sortedFlashcards.length) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Không có flashcards</p>
        </CardContent>
      </Card>
    )
  }

  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Đang tải...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Thẻ {currentIndex + 1} / {sortedFlashcards.length}
        </span>
        <div className="flex items-center gap-1">
          {getImportanceStars(currentCard.importance_score || 0)}
        </div>
      </div>

      {/* Flashcard */}
      <Card
        className="relative h-96 cursor-pointer transition-transform hover:scale-[1.02]"
        onClick={handleFlip}
      >
        <CardContent className="h-full flex flex-col items-center justify-center p-8">
          {!flipped ? (
            // Front side
            <div className="text-center space-y-4 w-full">
              <div className="space-y-2">
                <h2 className="text-4xl font-bold">
                  {currentCard.phrase || currentCard.word}
                </h2>
                {currentCard.phonetic && (
                  <p className="text-xl text-muted-foreground">
                    /{currentCard.phonetic}/
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <Badge
                  variant="outline"
                  className={getImportanceColor(currentCard.importance_score || 0)}
                >
                  Điểm: {(currentCard.importance_score || 0).toFixed(2)}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation()
                    speakText(currentCard.phrase || currentCard.word)
                  }}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>

              {currentCard.synonyms && currentCard.synonyms.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Từ đồng nghĩa:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentCard.synonyms.map((syn, idx) => (
                      <Badge key={idx} variant="secondary">
                        {syn}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground mt-8">
                Click để xem nghĩa và ví dụ
              </p>
            </div>
          ) : (
            // Back side
            <div className="text-center space-y-4 w-full">
              <h3 className="text-2xl font-semibold">
                {currentCard.phrase || currentCard.word}
              </h3>

              {currentCard.definition && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Nghĩa:</p>
                  <p className="text-lg">{currentCard.definition}</p>
                </div>
              )}

              {currentCard.context_sentence && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium text-muted-foreground">Ngữ cảnh:</p>
                  <div className="bg-accent/50 p-4 rounded-lg">
                    <p
                      className="text-base italic"
                      dangerouslySetInnerHTML={{
                        __html: currentCard.context_sentence,
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        const plainText = currentCard.context_sentence?.replace(
                          /<[^>]*>/g,
                          ""
                        )
                        if (plainText) speakText(plainText)
                      }}
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      Phát âm câu
                    </Button>
                  </div>
                </div>
              )}

              {currentCard.example && (
                <div className="space-y-2 mt-4">
                  <p className="text-sm font-medium text-muted-foreground">Ví dụ:</p>
                  <p className="text-base">{currentCard.example}</p>
                </div>
              )}

              <p className="text-sm text-muted-foreground mt-8">
                Click để quay lại
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={sortedFlashcards.length <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Trước
        </Button>

        <Button variant="outline" onClick={handleFlip}>
          Lật thẻ
        </Button>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={sortedFlashcards.length <= 1}
        >
          Sau
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* List view */}
      <Card>
        <CardHeader>
          <CardTitle>Tất cả từ vựng ({sortedFlashcards.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedFlashcards.map((card, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  idx === currentIndex
                    ? "bg-primary/10 border border-primary"
                    : "hover:bg-accent"
                }`}
                onClick={() => {
                  setCurrentIndex(idx)
                  setFlipped(false)
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-8">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="font-medium">{card.phrase || card.word}</p>
                    {card.phonetic && (
                      <p className="text-sm text-muted-foreground">
                        /{card.phonetic}/
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {getImportanceStars(card.importance_score || 0)}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      speakText(card.phrase || card.word)
                    }}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
