"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import DashboardLayout from "@/components/DashboardLayout"
import Link from "next/link"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  provider?: string
}

const QUICK_PROMPTS = [
  "Giải thích sự khác nhau giữa 'make' và 'do'",
  "Cho tôi 5 cụm từ tiếng Anh thông dụng trong công việc",
  "Sửa lỗi ngữ pháp: 'I am go to school yesterday'",
  "Giải thích thì hiện tại hoàn thành với ví dụ",
  "Cách dùng 'although' và 'even though'",
  "Từ vựng về chủ đề môi trường",
]

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user"
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
        isUser
          ? "bg-indigo-600 text-white"
          : "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
      }`}>
        {isUser ? "U" : "AI"}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? "bg-indigo-600 text-white rounded-tr-sm"
          : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
      }`}>
        <div className="whitespace-pre-wrap">{msg.content}</div>
        {msg.provider && !isUser && (
          <div className="mt-1.5 text-xs opacity-50">{msg.provider}</div>
        )}
      </div>
    </motion.div>
  )
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        AI
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-gray-400 rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Xin chào! Tôi là trợ lý AI học tiếng Anh của bạn. Hãy hỏi tôi bất cứ điều gì về tiếng Anh — từ vựng, ngữ pháp, cách dùng từ, hay bất kỳ câu hỏi nào bạn muốn.",
    }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [noApiKey, setNoApiKey] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = async (content?: string) => {
    const text = content || input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setLoading(true)
    setNoApiKey(false)

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.id !== "welcome").map(m => ({
            role: m.role,
            content: m.content,
          }))
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === "no_api_key") {
          setNoApiKey(true)
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: "assistant",
            content: data.message,
          }])
          return
        }
        throw new Error(data.error || "Request failed")
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: data.content,
        provider: data.provider,
      }])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "assistant",
        content: "Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.",
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Xin chào! Tôi là trợ lý AI học tiếng Anh của bạn. Hãy hỏi tôi bất cứ điều gì về tiếng Anh.",
    }])
    setNoApiKey(false)
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto px-4 py-4">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 flex-shrink-0"
        >
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Trợ lý AI</h1>
            <p className="text-xs text-gray-500 mt-0.5">Hỏi bất cứ điều gì về tiếng Anh</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Xóa hội thoại
            </button>
          </div>
        </motion.div>

        {/* No API key banner */}
        <AnimatePresence>
          {noApiKey && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex-shrink-0"
            >
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-sm text-amber-800">Chưa có API key. Vào Settings để thêm.</p>
                <Link
                  href="/settings"
                  className="flex-shrink-0 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cài đặt
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-2 pr-1">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
          <AnimatePresence>
            {loading && <TypingIndicator />}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-shrink-0 py-3"
          >
            <p className="text-xs text-gray-400 mb-2">Gợi ý câu hỏi:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all text-gray-700 line-clamp-1"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Input */}
        <div className="flex-shrink-0 pt-3 border-t border-gray-100">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi... (Enter để gửi, Shift+Enter xuống dòng)"
                rows={1}
                className="w-full px-4 py-3 pr-12 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none bg-gray-50 transition-all"
                style={{ maxHeight: "120px", overflowY: "auto" }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-11 h-11 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center shadow-md shadow-indigo-200"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">
            Sử dụng API key của bạn từ Settings
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
