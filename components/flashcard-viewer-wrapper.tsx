"use client"

import { useEffect, useState } from "react"
import FlashcardViewer from "./flashcard-viewer"
import { Card, CardContent } from "@/components/ui/card"

interface FlashcardViewerWrapperProps {
  flashcards: any[]
}

export default function FlashcardViewerWrapper({ flashcards }: FlashcardViewerWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Đang tải flashcards...</p>
        </CardContent>
      </Card>
    )
  }

  return <FlashcardViewer flashcards={flashcards} />
}
