"use client"

import { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'

// Register dagre layout
if (typeof cytoscape !== 'undefined') {
  cytoscape.use(dagre)
}

interface KnowledgeGraphViewerProps {
  data: {
    nodes: Array<{
      id: string
      label: string
      type: 'root' | 'cluster' | 'phrase' | 'word'
      cluster_id?: number
    }>
    edges: Array<{
      source: string
      target: string
      relation: string
    }>
  }
}

export function KnowledgeGraphViewer({ data }: KnowledgeGraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<any>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)

  useEffect(() => {
    if (!containerRef.current || !data) return

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      
      elements: {
        nodes: data.nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            cluster_id: node.cluster_id
          }
        })),
        edges: data.edges.map(edge => ({
          data: {
            source: edge.source,
            target: edge.target,
            label: edge.relation
          }
        }))
      },

      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#666',
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'color': '#fff',
            'text-outline-color': '#666',
            'text-outline-width': 2,
            'width': 60,
            'height': 60
          }
        },
        {
          selector: 'node[type="root"]',
          style: {
            'background-color': '#FF6B6B',
            'width': 80,
            'height': 80,
            'font-size': '14px',
            'font-weight': 'bold'
          }
        },
        {
          selector: 'node[type="cluster"]',
          style: {
            'background-color': '#4ECDC4',
            'width': 70,
            'height': 70,
            'font-size': '13px'
          }
        },
        {
          selector: 'node[type="phrase"]',
          style: {
            'background-color': '#45B7D1',
            'width': 50,
            'height': 50
          }
        },
        {
          selector: 'node[type="word"]',
          style: {
            'background-color': '#96CEB4',
            'width': 40,
            'height': 40,
            'font-size': '10px'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#ccc',
            'target-arrow-color': '#ccc',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'text-rotation': 'autorotate',
            'text-margin-y': -10
          }
        },
        {
          selector: ':selected',
          style: {
            'background-color': '#FFA07A',
            'line-color': '#FFA07A',
            'target-arrow-color': '#FFA07A',
            'border-width': 3,
            'border-color': '#FFA07A'
          }
        }
      ],

      layout: {
        name: 'dagre',
        rankDir: 'TB', // Top to Bottom
        nodeSep: 50,
        rankSep: 100,
        padding: 30
      },

      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.2
    })

    // Event handlers
    cy.on('tap', 'node', (evt: any) => {
      const node = evt.target
      setSelectedNode({
        id: node.id(),
        label: node.data('label'),
        type: node.data('type'),
        cluster_id: node.data('cluster_id')
      })
    })

    cy.on('tap', (evt: any) => {
      if (evt.target === cy) {
        setSelectedNode(null)
      }
    })

    cyRef.current = cy

    return () => {
      cy.destroy()
    }
  }, [data])

  const handleResetView = () => {
    if (cyRef.current) {
      cyRef.current.fit()
    }
  }

  const handleChangeLayout = (layoutName: string) => {
    if (cyRef.current) {
      cyRef.current.layout({
        name: layoutName,
        rankDir: 'TB',
        nodeSep: 50,
        rankSep: 100,
        padding: 30
      }).run()
    }
  }

  return (
    <div className="relative w-full h-full">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleResetView}
          className="px-3 py-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-sm"
        >
          Reset View
        </button>
        <select
          onChange={(e) => handleChangeLayout(e.target.value)}
          className="px-3 py-2 bg-white rounded-lg shadow-md text-sm"
        >
          <option value="dagre">Tree (Dagre)</option>
          <option value="breadthfirst">Breadth First</option>
          <option value="circle">Circle</option>
          <option value="grid">Grid</option>
          <option value="cose">Force Directed</option>
        </select>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="w-full h-full bg-gray-50 rounded-lg"
        style={{ minHeight: '600px' }}
      />

      {/* Node Info Panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg max-w-xs">
          <h3 className="font-bold text-lg mb-2">{selectedNode.label}</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-semibold">Type:</span> {selectedNode.type}</p>
            {selectedNode.cluster_id !== undefined && (
              <p><span className="font-semibold">Cluster:</span> {selectedNode.cluster_id}</p>
            )}
            <p><span className="font-semibold">ID:</span> {selectedNode.id}</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-white p-3 rounded-lg shadow-md text-xs">
        <h4 className="font-bold mb-2">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#FF6B6B]"></div>
            <span>Root (Document)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#4ECDC4]"></div>
            <span>Cluster (Topic)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#45B7D1]"></div>
            <span>Phrase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#96CEB4]"></div>
            <span>Word</span>
          </div>
        </div>
      </div>
    </div>
  )
}
