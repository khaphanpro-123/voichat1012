import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { getUserApiKeys } from "@/lib/getUserApiKey"
import { callAI } from "@/lib/aiProvider"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as any).id

    const { messages } = await request.json()
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 })
    }

    const keys = await getUserApiKeys(userId)
    if (!keys.openaiKey && !keys.groqKey && !keys.cohereKey) {
      return NextResponse.json({
        error: "no_api_key",
        message: "Bạn chưa cài đặt API key. Vui lòng vào Settings để thêm OpenAI hoặc Groq API key."
      }, { status: 400 })
    }

    // Build prompt from conversation history
    const systemPrompt = `Bạn là trợ lý học tiếng Anh thông minh. Hãy giúp người dùng học tiếng Anh hiệu quả.
- Trả lời bằng tiếng Việt khi người dùng hỏi bằng tiếng Việt
- Trả lời bằng tiếng Anh khi người dùng hỏi bằng tiếng Anh
- Khi giải thích từ vựng hoặc ngữ pháp, hãy đưa ra ví dụ cụ thể
- Định dạng câu trả lời rõ ràng, dễ đọc`

    // Format conversation for the AI
    const conversationText = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
      )
      .join("\n\n")

    const fullPrompt = `${systemPrompt}\n\nLịch sử hội thoại:\n${conversationText}\n\nAssistant:`

    const result = await callAI(fullPrompt, keys, { maxTokens: 1000 })

    return NextResponse.json({
      content: result.content,
      provider: result.provider,
    })
  } catch (error: any) {
    console.error("AI chat error:", error)
    return NextResponse.json(
      { error: error.message || "AI request failed" },
      { status: 500 }
    )
  }
}
