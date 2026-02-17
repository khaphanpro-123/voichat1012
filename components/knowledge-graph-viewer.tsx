"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react"

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
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<any>(null)
  const [layout, setLayout] = useState("dagre")
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [cytoscape, setCytoscape] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    
    // Load Cytoscape only on client side
    if (typeof window !== "undefined") {
      Promise.all([
        import("cytoscape"),
        import("cytoscape-dagre")
      ]).then(([cytoscapeModule, dagreModule]) => {
        const cy = cytoscapeModule.default
        const dagre = dagreModule.default
        cy.use(dagre)
        setCytoscape(() => cy)
      }).catch(err => {
        console.error("Failed to load Cytoscape:", err)
      })
    }
  }, [])

  useEffect(() => {
    if (!mounted || !containerRef.current || !graphData || !cytoscape) return

    // Convert backend data to Cytoscape format
    const elements: any[] = [
      // Nodes
      ...graphData.entities.map((entity) => ({
        data: {
          id: entity.id,
          label: entity.label,
          type: entity.type,
          importance: entity.importance || 0.5,
        },
      })),
      // Edges
      ...graphData.relations.map((relation, idx) => ({
        data: {
          id: `edge-${idx}`,
          source: relation.source,
          target: relation.target,
          type: relation.type,
          weight: relation.weight || 0.5,
          label: relation.label || relation.type,
        },
      })),
    ]

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele: any) => {
              const type = ele.data("type")
              if (type === "cluster") return "#3b82f6"
              if (type === "phrase") return "#10b981"
              if (type === "word") return "#f59e0b"
              return "#6b7280"
            },
            label: "data(label)",
            color: "#fff",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": "12px",
            "font-weight": "bold",
            width: (ele: any) => {
              const importance = ele.data("importance") || 0.5
              return 30 + importance * 40
            },
            height: (ele: any) => {
              const importance = ele.data("importance") || 0.5
              return 30 + importance * 40
            },
            "border-width": 2,
            "border-color": "#fff",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-width": 4,
            "border-color": "#ef4444",
          },
        },
        {
          selector: "edge",
          style: {
            width: (ele: any) => {
              const weight = ele.data("weight") || 0.5
              return 1 + weight * 3
            },
            "line-color": (ele: any) => {
              const type = ele.data("type")
              if (type === "contains") return "#3b82f6"
              if (type === "similar_to") return "#10b981"
              if (type === "related_to") return "#f59e0b"
              return "#6b7280"
            },
            "target-arrow-color": (ele: any) => {
              const type = ele.data("type")
              if (type === "contains") return "#3b82f6"
              if (type === "similar_to") return "#10b981"
              if (type === "related_to") return "#f59e0b"
              return "#6b7280"
            },
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "10px",
            "text-rotation": "autorotate",
            "text-margin-y": -10,
          },
        },
      ],
      layout: {
        name: layout,
        rankDir: "TB",
        nodeSep: 50,
        rankSep: 100,
      },
    })

    // Event handlers
    cy.on("tap", "node", (evt) => {
      const node = evt.target
      setSelectedNode({
        id: node.data("id"),
        label: node.data("label"),
        type: node.data("type"),
        importance: node.data("importance"),
      })
    })

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        setSelectedNode(null)
      }
    })

    cyRef.current = cy

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
      }
    }
  }, [graphData, layout, mounted, cytoscape])

  const handleZoomIn = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.2)
  }

  const handleZoomOut = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 0.8)
  }

  const handleFit = () => {
    cyRef.current?.fit(undefined, 50)
  }

  const handleDownload = () => {
    if (!cyRef.current) return
    const png = cyRef.current.png({ scale: 2 })
    const link = document.createElement("a")
    link.href = png
    link.download = `${documentTitle}-knowledge-graph.png`
    link.click()
  }

  const handleLayoutChange = (newLayout: string) => {
    setLayout(newLayout)
    if (cyRef.current) {
      cyRef.current
        .layout({
          name: newLayout,
          rankDir: "TB",
          nodeSep: 50,
          rankSep: 100,
        })
        .run()
    }
  }

  if (!graphData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Không có dữ liệu knowledge graph</p>
        </CardContent>
      </Card>
    )
  }

  if (!mounted || !cytoscape) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Đang tải knowledge graph...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={layout} onValueChange={handleLayoutChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dagre">Hierarchical</SelectItem>
                  <SelectItem value="breadthfirst">Breadth First</SelectItem>
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="grid">Grid</SelectItem>
                  <SelectItem value="cose">Force Directed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleFit}>
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Graph */}
      <Card>
        <CardContent className="p-0">
          <div ref={containerRef} className="w-full h-[600px]" />
        </CardContent>
      </Card>

      {/* Selected Node Info */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết node</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Label:</span>
                <p className="font-medium">{selectedNode.label}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Type:</span>
                <Badge variant="outline" className="ml-2">
                  {selectedNode.type}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Importance:</span>
                <p className="font-medium">
                  {(selectedNode.importance * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Chú thích</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Node Types:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500" />
                  <span className="text-sm">Cluster</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-sm">Phrase</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500" />
                  <span className="text-sm">Word</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Edge Types:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-blue-500" />
                  <span className="text-sm">Contains</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-green-500" />
                  <span className="text-sm">Similar to</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-orange-500" />
                  <span className="text-sm">Related to</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
