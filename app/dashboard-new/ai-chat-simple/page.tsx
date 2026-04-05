"use client"

import { useState } from "react"

export default function AiChatSimplePage() {
  const [input, setInput] = useState("")

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="flex-1 p-4">
        <h1 className="text-2xl font-bold mb-4">AI Chat Simple Test</h1>
        <p>This is a simple test page without DashboardLayout</p>
      </div>
      
      <div className="p-4 border-t border-gray-800">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="w-full px-4 py-3 bg-gray-800 rounded-lg text-white"
        />
      </div>
    </div>
  )
}
