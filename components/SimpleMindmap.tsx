"use client"

import { useEffect, useRef } from 'react'

interface Entity {
  id: string
  label: string
  type: string
}

interface Relation {
  source: string
  target: string
  relation: string
}

interface MindmapProps {
  entities: Entity[]
  relations: Relation[]
}

export default function SimpleMindmap({ entities, relations }: MindmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !entities || entities.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = 600

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate positions - hierarchical tree layout
    const centerX = canvas.width / 2
    const startY = 80
    const levelHeight = 120
    
    // Center node (main topic)
    const centerNode = entities[0]
    const centerPos = { x: centerX, y: startY, label: centerNode.label, id: centerNode.id }
    
    // Child nodes in levels
    const childNodes = entities.slice(1, 21)
    const nodesPerLevel = Math.ceil(Math.sqrt(childNodes.length))
    
    const positions = [centerPos]
    
    childNodes.forEach((entity, idx) => {
      const level = Math.floor(idx / nodesPerLevel) + 1
      const posInLevel = idx % nodesPerLevel
      const totalInLevel = Math.min(nodesPerLevel, childNodes.length - (level - 1) * nodesPerLevel)
      const spacing = Math.min(canvas.width / (totalInLevel + 1), 150)
      const offsetX = (canvas.width - spacing * (totalInLevel - 1)) / 2
      
      positions.push({
        id: entity.id,
        label: entity.label,
        x: offsetX + posInLevel * spacing,
        y: startY + level * levelHeight
      })
    })

    // Draw connections (curved lines)
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2
    
    relations.slice(0, 50).forEach(rel => {
      const source = positions.find(p => p.id === rel.source)
      const target = positions.find(p => p.id === rel.target)
      if (source && target) {
        // Draw curved line
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        
        const midX = (source.x + target.x) / 2
        const midY = (source.y + target.y) / 2
        const cpX = midX
        const cpY = source.y + (target.y - source.y) * 0.3
        
        ctx.quadraticCurveTo(cpX, cpY, target.x, target.y)
        ctx.stroke()
      }
    })

    // Draw nodes
    positions.forEach((pos, idx) => {
      const isCenter = idx === 0
      const radius = isCenter ? 40 : 30
      
      // Draw shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
      
      // Draw circle
      ctx.fillStyle = isCenter ? '#3b82f6' : '#60a5fa'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI)
      ctx.fill()
      
      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      // Draw border
      ctx.strokeStyle = isCenter ? '#1e40af' : '#3b82f6'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw label inside circle
      ctx.fillStyle = '#ffffff'
      ctx.font = isCenter ? 'bold 14px sans-serif' : '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      const maxWidth = radius * 1.6
      const label = pos.label.length > 12 ? pos.label.substring(0, 10) + '..' : pos.label
      ctx.fillText(label, pos.x, pos.y, maxWidth)
    })

  }, [entities, relations])

  if (!entities || entities.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
        Không có dữ liệu để hiển thị sơ đồ tư duy
      </div>
    )
  }

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-white"
        style={{ height: '600px' }}
      />
      <div className="mt-2 text-xs text-gray-500 text-center">
        Hiển thị {Math.min(entities.length, 21)} chủ đề và {Math.min(relations.length, 50)} mối quan hệ
      </div>
    </div>
  )
}
