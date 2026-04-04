import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"

const SYSTEM_PROMPT = `Bạn là trợ lý học tiếng Anh thông minh tên là EnglishPal AI.
- Trả lời bằng tiếng Việt khi người dùng hỏi bằng tiếng Việt
- Trả lời bằng tiếng Anh khi người dùng hỏi bằng tiếng Anh  
- Khi giải thích từ vựng hoặc ngữ pháp, đưa ra ví dụ cụ thể
- Định dạng câu trả lời rõ ràng, dễ đọc
- Ngắn gọn, súc tích nhưng đầy đủ thông tin`

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    const { messages } = await request.json()
    if (!messages?.length) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 })
    }

    const keys = await getUserApiKeys(userId)
    if (!keys.openaiKey && !keys.groqKey) {
      return NextResponse.json({
        error: "no_api_key",
        message: "Bạn chưa cài đặt API key. Vui lòng vào Settings để thêm OpenAI hoặc Groq API key."
      }, { status: 400 })
    }

    // Format messages for chat completions API
    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }))
    ]

    // Try Groq first (fastest), then OpenAI
    if (keys.groqKey) {
      const stream = await callGroqStream(keys.groqKey, chatMessages)
      if (stream) return stream
    }
    if (keys.openaiKey) {
      const stream = await callOpenAIStream(keys.openaiKey, chatMessages)
      if (stream) return stream
    }

    return NextResponse.json({ error: "All providers failed" }, { status: 500 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function callGroqStream(apiKey: string, messages: any[]) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!res.ok || !res.body) return null

    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Provider": "groq",
      },
    })
  } catch {
    return null
  }
}

async function callOpenAIStream(apiKey: string, messages: any[]) {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })

    if (!res.ok || !res.body) return null

    return new Response(res.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Provider": "openai",
      },
    })
  } catch {
    return null
  }
}
