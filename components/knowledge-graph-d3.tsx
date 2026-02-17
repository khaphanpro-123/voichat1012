"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react"

interface KnowledgeGraphD3Props {
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

export default function KnowledgeGraphD3({
  graphData,
  documentTitle = "Document",
}: KnowledgeGraphD3Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mounted, setMounted] = useState(false)
  const [d3Module, setD3Module] = useState<any>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    
    // Load D3 only on client side
    if (typeof window !== "undefined") {
      import("d3").then((d3) => {
        setD3Module(d3)
      }).catch(err => {
        console.error("Failed to load D3:", err)
      })
    }
  }, [])

  useEffect(() => {
    if (!mounted || !svgRef.current || !graphData || !d3Module) return

    const d3 = d3Module
    const svg = d3.select(svgRef.current)
    const width = 800
    const height = 600

    // Clear previous content
    svg.selectAll("*").remove()

    // Create container group
    const g = svg.append("g")

    // Prepare data
    const nodes = graphData.entities.map(e => ({
      id: e.id,
      label: e.label,
      type: e.type,
      importance: e.importance || 0.5,
    }))

    const links = graphData.relations.map(r => ({
      source: r.source,
      target: r.target,
      type: r.type,
      weight: r.weight || 0.5,
      label: r.label || r.type,
    }))

    // Color scale
    const colorScale = (type: string) => {
      if (type === "cluster") return "#3b82f6"
      if (type === "phrase") return "#10b981"
      if (type === "word") return "#f59e0b"
      return "#6b7280"
    }

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30))

    // Draw links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => {
        if (d.type === "contains") return "#3b82f6"
        if (d.type === "similar_to") return "#10b981"
        if (d.type === "related_to") return "#f59e0b"
        return "#6b7280"
      })
      .attr("stroke-width", (d: any) => 1 + d.weight * 3)
      .attr("stroke-opacity", 0.6)

    // Draw nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d: any) => 10 + d.importance * 20)
      .attr("fill", (d: any) => colorScale(d.type))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event: any, d: any) => {
        setSelectedNode(d)
      })
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any)

    // Add labels
    const label = g.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d: any) => d.label)
      .attr("font-size", 10)
      .attr("dx", 15)
      .attr("dy", 4)
      .style("pointer-events", "none")

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y)

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y)
    })

    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5])
      .on("zoom", (event: any) => {
        g.attr("transform", event.transform)
      })

    svg.call(zoom as any)

    return () => {
      simulation.stop()
    }
  }, [graphData, mounted, d3Module])

  const handleZoomIn = () => {
    if (!svgRef.current || !d3Module) return
    const svg = d3Module.select(svgRef.current)
    svg.transition().call(
      d3Module.zoom().scaleBy as any,
      1.3
    )
  }

  const handleZoomOut = () => {
    if (!svgRef.current || !d3Module) return
    const svg = d3Module.select(svgRef.current)
    svg.transition().call(
      d3Module.zoom().scaleBy as any,
      0.7
    )
  }

  const handleFit = () => {
    if (!svgRef.current || !d3Module) return
    const svg = d3Module.select(svgRef.current)
    svg.transition().call(
      d3Module.zoom().transform as any,
      d3Module.zoomIdentity
    )
  }

  const handleDownload = () => {
    if (!svgRef.current) return
    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${documentTitle}-knowledge-graph.svg`
    link.click()
    URL.revokeObjectURL(url)
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

  if (!mounted || !d3Module) {
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
            <div className="text-sm text-muted-foreground">
              {graphData.entities?.length || 0} nodes, {graphData.relations?.length || 0} edges
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
          <svg
            ref={svgRef}
            width="100%"
            height="600"
            viewBox="0 0 800 600"
            style={{ background: "hsl(var(--background))" }}
          />
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
