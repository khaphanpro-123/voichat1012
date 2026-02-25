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

    // Calculate positions in a circle
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(canvas.width, canvas.height) / 3

    const positions = entities.slice(0, 20).map((entity, idx) => {
      const angle = (idx / Math.min(entities.length, 20)) * 2 * Math.PI
      return {
        id: entity.id,
        label: entity.label,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      }
    })

    // Draw relations (lines)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1
    relations.slice(0, 50).forEach(rel => {
      const source = positions.find(p => p.id === rel.source)
      const target = positions.find(p => p.id === rel.target)
      if (source && target) {
        ctx.beginPath()
        ctx.moveTo(source.x, source.y)
        ctx.lineTo(target.x, target.y)
        ctx.stroke()
      }
    })

    // Draw nodes
    positions.forEach((pos, idx) => {
      // Draw circle
      ctx.fillStyle = idx === 0 ? '#3b82f6' : '#60a5fa'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, idx === 0 ? 30 : 20, 0, 2 * Math.PI)
      ctx.fill()

      // Draw label
      ctx.fillStyle = '#1e293b'
      ctx.font = idx === 0 ? 'bold 12px sans-serif' : '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      const maxWidth = 80
      const label = pos.label.length > 15 ? pos.label.substring(0, 12) + '...' : pos.label
      ctx.fillText(label, pos.x, pos.y + (idx === 0 ? 45 : 35), maxWidth)
    })

  }, [entities, relations])

  if (!entities || entities.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Không có dữ liệu để hiển thị sơ đồ tư duy
      </div>
    )
  }

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full border border-gray-200 rounded-lg bg-white"
        style={{ height: '600px' }}
      />
      <div className="mt-2 text-xs text-gray-500 text-center">
        Hiển thị {Math.min(entities.length, 20)} nodes và {Math.min(relations.length, 50)} connections
      </div>
    </div>
  )
}
