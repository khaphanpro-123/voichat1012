"use client"

import { useEffect, useState } from "react"
import KnowledgeGraphViewer from "./knowledge-graph-viewer"
import { Card, CardContent } from "@/components/ui/card"

interface KnowledgeGraphViewerWrapperProps {
  graphData?: any
  documentTitle?: string
}

export default function KnowledgeGraphViewerWrapper({ 
  graphData, 
  documentTitle 
}: KnowledgeGraphViewerWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Đang tải knowledge graph...</p>
        </CardContent>
      </Card>
    )
  }

  return <KnowledgeGraphViewer graphData={graphData} documentTitle={documentTitle} />
}
