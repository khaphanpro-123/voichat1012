"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"

interface KnowledgeGraphViewerProps {
  graphData?: {
    entities: Array<{
      id: string
      label: string
      type: string
      importance?: number
    }>
    relations: Array<{
      source: string
      target: string
      type: string
      weight?: number
      label?: string
    }>
  }
  documentTitle?: string
}

export default function KnowledgeGraphViewer({
  graphData,
  documentTitle = "Document",
}: KnowledgeGraphViewerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!graphData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Không có dữ liệu knowledge graph</p>
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

  // Temporary: Show data as list instead of graph
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Knowledge Graph - Chế độ danh sách
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Đang tạm thời hiển thị dưới dạng danh sách. Visualization sẽ được cập nhật sau.
          </p>
        </CardContent>
      </Card>

      {/* Entities */}
      <Card>
        <CardHeader>
          <CardTitle>Entities ({graphData.entities?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {graphData.entities?.map((entity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{entity.type}</Badge>
                  <span className="font-medium">{entity.label}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Importance: {((entity.importance || 0) * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Relations */}
      <Card>
        <CardHeader>
          <CardTitle>Relations ({graphData.relations?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {graphData.relations?.map((relation, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <span className="font-medium">{relation.source}</span>
                <Badge variant="secondary">{relation.type}</Badge>
                <span className="font-medium">{relation.target}</span>
                {relation.weight && (
                  <span className="text-sm text-muted-foreground ml-auto">
                    Weight: {relation.weight.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Chú thích</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Entity Types:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">cluster</Badge>
                  <span className="text-sm">Cụm từ</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">phrase</Badge>
                  <span className="text-sm">Cụm từ đơn</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">word</Badge>
                  <span className="text-sm">Từ đơn</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Relation Types:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">contains</Badge>
                  <span className="text-sm">Chứa</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">similar_to</Badge>
                  <span className="text-sm">Tương tự</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">related_to</Badge>
                  <span className="text-sm">Liên quan</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
