import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"

const SYSTEM_PROMPT = `Bạn là trợ lý học tiếng Anh thông minh tên là EnglishPal AI.
- Trả lời bằng tiếng Việt khi người dùng hỏi bằng tiếng Việt
- Trả lời bằng tiếng Anh khi người dùng hỏi bằng tiếng Anh  
- Khi giải thích từ vựng hoặc ngữ pháp, đưa ra ví dụ cụ thể
- Định dạng câu trả lời rõ ràng, dễ đọc`

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

    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }))
    ]

    // Try Groq first (fastest), then OpenAI
    if (keys.groqKey) {
      const result = await tryGroq(keys.groqKey, chatMessages)
      if (result.ok) return result.response!
      console.error("[ai-chat] Groq failed:", result.error)
    }

    if (keys.openaiKey) {
      const result = await tryOpenAI(keys.openaiKey, chatMessages)
      if (result.ok) return result.response!
      console.error("[ai-chat] OpenAI failed:", result.error)
      // Return specific error to user
      return NextResponse.json({
        error: "api_error",
        message: `Lỗi từ AI: ${result.error}`
      }, { status: 500 })
    }

    return NextResponse.json({ error: "All providers failed" }, { status: 500 })

  } catch (error: any) {
    console.error("[ai-chat] Unexpected error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function tryGroq(apiKey: string, messages: any[]): Promise<{ ok: boolean; response?: Response; error?: string }> {
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

    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `Groq ${res.status}: ${errText.slice(0, 200)}` }
    }

    if (!res.body) return { ok: false, error: "No response body from Groq" }

    return {
      ok: true,
      response: new Response(res.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Provider": "groq",
        },
      })
    }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

async function tryOpenAI(apiKey: string, messages: any[]): Promise<{ ok: boolean; response?: Response; error?: string }> {
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

    if (!res.ok) {
      const errText = await res.text()
      let friendlyError = `OpenAI ${res.status}`
      if (res.status === 401) friendlyError = "OpenAI API key không hợp lệ"
      else if (res.status === 429) friendlyError = "OpenAI quota đã hết, vui lòng thử lại sau"
      else if (res.status === 402) friendlyError = "Tài khoản OpenAI chưa có credit"
      return { ok: false, error: friendlyError }
    }

    if (!res.body) return { ok: false, error: "No response body from OpenAI" }

    return {
      ok: true,
      response: new Response(res.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Provider": "openai",
        },
      })
    }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
