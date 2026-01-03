// app/api/rag/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereClient } from "cohere-ai";

// Lazy-load clients to avoid build-time errors
let pineconeClient: Pinecone | null = null;
let cohereClient: CohereClient | null = null;

function getPinecone(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing PINECONE_API_KEY environment variable");
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

function getPineconeIndex() {
  const indexName = process.env.PINECONE_INDEX;
  if (!indexName) {
    throw new Error("Missing PINECONE_INDEX environment variable");
  }
  return getPinecone().index(indexName);
}

function getCohere(): CohereClient {
  if (!cohereClient) {
    const token = process.env.COHERE_API_KEY;
    if (!token) {
      throw new Error("Missing COHERE_API_KEY environment variable");
    }
    cohereClient = new CohereClient({ token });
  }
  return cohereClient;
}

// 🔹 Tạo embedding bằng Cohere
async function embedText(text: string): Promise<number[]> {
  const resp = await getCohere().embed({
    model: "embed-multilingual-v3.0",
    texts: [text],
    input_type: "search_document",
  });

  return (resp.embeddings as number[][])[0];
}

// 🔹 Convert conversation từ OpenAI format → Cohere format
function convertConversation(conv: Array<{ role: string; content: string }>) {
  return conv
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({
      role: msg.role === "user" ? ("USER" as const) : ("CHATBOT" as const),
      message: msg.content,
    }));
}

export async function POST(req: NextRequest) {
  try {
    const { message, conversation = [], userId, childId } = await req.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Thiếu message" },
        { status: 400 }
      );
    }

    const index = getPineconeIndex();

    // 1) Embed câu hỏi
    const qEmb = await embedText(message);

    // 2) Debug: check index info trước khi query
    try {
      const stats = await index.describeIndexStats();
      console.log("✅ Pinecone index stats:", stats);
    } catch (err) {
      console.error("❌ Không thể lấy index stats từ Pinecone:", err);
    }

    // 3) Tạo filter (chỉ thêm khi có giá trị thật)
    const filter: Record<string, string> = {};
    if (userId) filter.userId = userId;
    if (childId) filter.childId = childId;

    // 4) Query Pinecone
    const results = await index.query({
      topK: 5,
      vector: qEmb,
      includeMetadata: true,
      ...(Object.keys(filter).length > 0 ? { filter } : {}),
    });

    const hits = (results.matches ?? []).map((m) => m.metadata);
    const context = hits
      .map(
        (h: any, i: number) =>
          `Source ${i + 1} (${h.docId || "no-id"}):\n${h.text}`
      )
      .join("\n\n---\n\n");

    // 5) Prompt
    const system = `Bạn là trợ lý AI của phụ huynh, trả lời dựa trên dữ liệu hồ sơ, nhật ký, y tế trong CONTEXT.
Nếu không tìm thấy dữ liệu, hãy nói rõ "không có đủ dữ liệu".`;

    const userPrompt = `${system}\n\nUser: ${message}\n\nCONTEXT:\n${context}`;

    // 6) Convert conversation sang format của Cohere
    const chatHistory = convertConversation(conversation);

    // 7) Gọi Cohere chat
    const chatResp = await getCohere().chat({
      model: "command-r-plus",
      message: userPrompt,
      temperature: 0.2,
      chatHistory: chatHistory,
    });

    const answer = chatResp.text || "Xin lỗi, chưa có câu trả lời.";

    return NextResponse.json({
      success: true,
      answer,
      sources: hits.slice(0, 5),
    });
  } catch (err: any) {
    console.error("❌ Chat error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
