"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Network, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

interface KnowledgeGraphNode {
  id: string
  type: 'cluster' | 'phrase'
  label: string
  cluster_id?: number
  semantic_role?: string
  importance_score?: number
  size?: number
  color?: string
}

interface KnowledgeGraphEdge {
  source: string
  target: string
  type: 'contains' | 'similar_to'
  weight: number
  label?: string
}

interface KnowledgeGraphData {
  document_id: string
  document_title: string
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
  clusters: Array<{
    id: number
    name: string
    size: number
    color: string
  }>
  mindmap: string
  stats: {
    entities: number
    relations: number
    semantic_relations: number
    clusters: number
  }
}

interface Props {
  documentId: string
}

export default function KnowledgeGraphViewer({ documentId }: Props) {
  const [data, setData] = useState<KnowledgeGraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const API_URL = process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8000'

  useEffect(() => {
    fetchKnowledgeGraph()
  }, [documentId])

  const fetchKnowledgeGraph = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/knowledge-graph/${documentId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge graph')
      }
      
      const result = await response.json()
      setData(result)
      
      // Draw graph after data is loaded
      setTimeout(() => drawGraph(result), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const drawGraph = (graphData: KnowledgeGraphData) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Simple force-directed layout (basic implementation)
    const nodes = graphData.nodes.map((node, i) => ({
      ...node,
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: 0,
      vy: 0
    }))

    // Draw edges
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1

    graphData.edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source)
      const target = nodes.find(n => n.id === edge.target)

      if (source && target) {
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        
        if (edge.type === 'similar_to') {
          ctx.strokeStyle = '#3b82f6'
          ctx.setLineDash([5, 5])
        } else {
          ctx.strokeStyle = '#cbd5e1'
          ctx.setLineDash([])
        }
        
        ctx.stroke()
      }
    })

    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath()
      const radius = node.type === 'cluster' ? 30 : 15
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
      
      if (node.type === 'cluster') {
        ctx.fillStyle = node.color || '#FF6B6B'
      } else {
        ctx.fillStyle = node.semantic_role === 'core' ? '#10b981' : '#6366f1'
      }
      
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw label
      ctx.fillStyle = '#1e293b'
      ctx.font = node.type === 'cluster' ? 'bold 14px sans-serif' : '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(node.label, node.x, node.y + radius + 15)
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Network className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-500" />
              <p className="text-muted-foreground">Loading knowledge graph...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Error: {error || 'No data available'}</p>
            <Button onClick={fetchKnowledgeGraph} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data.stats.entities}</div>
            <div className="text-sm text-muted-foreground">Entities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data.stats.relations}</div>
            <div className="text-sm text-muted-foreground">Relations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data.stats.semantic_relations}</div>
            <div className="text-sm text-muted-foreground">Semantic Links</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{data.stats.clusters}</div>
            <div className="text-sm text-muted-foreground">Clusters</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Graph</CardTitle>
          <CardDescription>{data.document_title}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="graph">
            <TabsList className="mb-4">
              <TabsTrigger value="graph">Graph View</TabsTrigger>
              <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
              <TabsTrigger value="clusters">Clusters</TabsTrigger>
            </TabsList>

            <TabsContent value="graph">
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-[600px] border rounded-lg bg-white"
                  onClick={(e) => {
                    // Handle node click
                    const rect = canvasRef.current?.getBoundingClientRect()
                    if (rect) {
                      const x = e.clientX - rect.left
                      const y = e.clientY - rect.top
                      // Find clicked node (simplified)
                      console.log('Clicked at:', x, y)
                    }
                  }}
                />
                
                {/* Controls */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button size="sm" variant="outline">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#FF6B6B]" />
                  <span className="text-sm">Cluster</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-sm">Core Phrase</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-indigo-500" />
                  <span className="text-sm">Phrase</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-0.5 bg-gray-300" />
                  <span className="text-sm">Contains</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-0.5 bg-blue-500 border-dashed" />
                  <span className="text-sm">Similar</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="mindmap">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {data.mindmap}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="clusters">
              <div className="space-y-4">
                {data.clusters.map(cluster => (
                  <Card key={cluster.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cluster.color }}
                        />
                        <CardTitle className="text-lg">{cluster.name}</CardTitle>
                        <Badge variant="secondary">{cluster.size} items</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {data.nodes
                          .filter(n => n.cluster_id === cluster.id && n.type === 'phrase')
                          .map(node => (
                            <Badge key={node.id} variant="outline">
                              {node.label}
                            </Badge>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
