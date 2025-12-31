import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI } from "@/lib/aiProvider";

// Shorter system prompt to save tokens
const SYSTEM_PROMPT = `You are a friendly English chat partner for Vietnamese learners.
Rules:
- Keep responses SHORT (1-2 sentences) - this is voice chat
- Be natural and friendly
- Ask follow-up questions
- If user makes mistakes, naturally model correct form (recasting)
- Use simple vocabulary`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIKeys {
  openaiKey?: string | null;
  groqKey?: string | null;
  cohereKey?: string | null;
}

async function chatWithAI(
  userMessage: string,
  conversationHistory: Message[],
  level: string,
  keys: AIKeys
): Promise<{ text: string; provider: string; model: string }> {
  // Only keep last 6 messages to save tokens
  const historyText = conversationHistory
    .slice(-6)
    .map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = `${SYSTEM_PROMPT}

Level: ${level}
${historyText ? `History:\n${historyText}\n` : ""}
User: "${userMessage}"

Assistant (1-2 sentences):`;

  const result = await callAI(prompt, keys, {
    temperature: 0.8,
    maxTokens: 100  // Reduced from 150
  });

  if (!result.success) {
    throw new Error(result.error || "AI API error");
  }

  const text = result.content.replace(/^(Emma:|Assistant:)\s*/i, "").trim();
  return { text, provider: result.provider, model: result.model };
}

// Simple pronunciation scoring without AI (to save quota)
function scorePronunciation(spoken: string, target: string): { score: number; feedback: string } {
  const spokenWords = spoken.toLowerCase().trim().split(/\s+/);
  const targetWords = target.toLowerCase().trim().split(/\s+/);
  
  let matches = 0;
  for (const word of spokenWords) {
    if (targetWords.includes(word)) matches++;
  }
  
  const accuracy = targetWords.length > 0 ? (matches / targetWords.length) * 100 : 0;
  const score = Math.min(100, Math.round(accuracy));
  
  let feedback = "";
  if (score >= 90) feedback = "Xuất sắc! Phát âm rất tốt! 🎉";
  else if (score >= 70) feedback = "Tốt lắm! Tiếp tục luyện tập nhé! 👍";
  else if (score >= 50) feedback = "Khá tốt! Hãy thử lại để cải thiện. 💪";
  else feedback = "Cần luyện tập thêm. Nghe lại và thử lại nhé! 🔄";
  
  return { score, feedback };
}

export async function POST(req: NextRequest) {
  try {
    // Parse body ONCE at the beginning
    const body = await req.json();
    const { 
      action, 
      message, 
      conversationHistory = [], 
      level = "A2", 
      userId = "anonymous",
      spokenText,
      targetSentence
    } = body;

    // Get API keys
    const keys = await getUserApiKeys(userId);
    
    if (!keys.openaiKey && !keys.groqKey && !keys.cohereKey) {
      return NextResponse.json({
        success: false,
        message: "Chưa có API key. Vui lòng thêm Groq key (miễn phí) trong Settings.",
        needApiKey: true,
      }, { status: 400 });
    }

    // Start session - no AI call needed
    if (action === "start") {
      const greetings = [
        "Hey! What's on your mind today?",
        "Hi! Ready to chat? Tell me about your day!",
        "Hello! What would you like to talk about?",
      ];
      
      return NextResponse.json({
        success: true,
        response: greetings[Math.floor(Math.random() * greetings.length)],
        sessionId: `live_${Date.now()}`,
      });
    }

    // Chat - main conversation
    if (action === "chat") {
      if (!message?.trim()) {
        return NextResponse.json({ success: false, message: "Message required" }, { status: 400 });
      }

      const { text: response, provider, model } = await chatWithAI(
        message, conversationHistory, level, keys
      );

      return NextResponse.json({
        success: true,
        response,
        userMessage: message,
        provider,
        model
      });
    }

    // Check Pronunciation - use simple scoring to save quota
    if (action === "checkPronunciation") {
      if (!spokenText?.trim() || !targetSentence?.trim()) {
        return NextResponse.json({ 
          success: false, 
          message: "spokenText and targetSentence required" 
        }, { status: 400 });
      }

      // Use simple scoring (no AI call - saves quota!)
      const { score, feedback } = scorePronunciation(spokenText, targetSentence);

      return NextResponse.json({
        success: true,
        feedback,
        pronunciationFeedback: {
          score,
          errors: [],
          correctedText: targetSentence
        }
      });
    }

    // Check Grammar - for pronunciation practice input
    if (action === "checkGrammar") {
      const { sentence } = body;
      
      if (!sentence?.trim()) {
        return NextResponse.json({ 
          success: false, 
          message: "sentence required" 
        }, { status: 400 });
      }

      const grammarPrompt = `You are an English grammar checker for Vietnamese learners.
Check this sentence for grammar errors: "${sentence}"

If there are errors, respond in this EXACT JSON format:
{
  "hasErrors": true,
  "correctedSentence": "the corrected sentence",
  "errors": [
    {
      "original": "wrong word/phrase",
      "corrected": "correct word/phrase", 
      "explanation": "brief explanation in English",
      "explanationVi": "giải thích ngắn bằng tiếng Việt"
    }
  ]
}

If the sentence is correct, respond:
{
  "hasErrors": false,
  "correctedSentence": "${sentence}",
  "errors": []
}

ONLY return valid JSON, no other text.`;

      try {
        const result = await callAI(grammarPrompt, keys, {
          temperature: 0.1,
          maxTokens: 300
        });

        if (result.success) {
          // Parse JSON from response
          let grammarCheck;
          try {
            // Try to extract JSON from response
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              grammarCheck = JSON.parse(jsonMatch[0]);
            } else {
              grammarCheck = JSON.parse(result.content);
            }
          } catch (parseErr) {
            // If parsing fails, assume no errors
            grammarCheck = {
              hasErrors: false,
              correctedSentence: sentence,
              errors: []
            };
          }

          return NextResponse.json({
            success: true,
            grammarCheck
          });
        } else {
          // If AI fails, just proceed without grammar check
          return NextResponse.json({
            success: true,
            grammarCheck: {
              hasErrors: false,
              correctedSentence: sentence,
              errors: []
            }
          });
        }
      } catch (err) {
        console.error("Grammar check error:", err);
        return NextResponse.json({
          success: true,
          grammarCheck: {
            hasErrors: false,
            correctedSentence: sentence,
            errors: []
          }
        });
      }
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Voice chat error:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Chat failed",
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Voice Chat Live API - Optimized for quota efficiency",
    features: [
      "Natural conversation with AI (Emma)",
      "Short responses (1-2 sentences)",
      "Pronunciation scoring (no AI needed)",
      "Supports Gemini, OpenAI, Groq, Cohere"
    ]
  });
}
