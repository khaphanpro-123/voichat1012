import { useState, useCallback } from "react";

export interface Message {
  id: string;
  type: "user" | "ai";
  text: string;
  hasCorrection?: boolean;
  correction?: {
    original: string;
    corrected: string;
    explanation: string;
    errors?: Array<{
      type: string;
      position: number;
      original: string;
      corrected: string;
      explanation: string;
    }>;
  };
  timestamp: Date;
  audioUrl?: string;
  intent?: string;
  confidence?: number;
  documentResults?: string[];
  bilingualResponse?: {
    vietnamese: string;
    english: string;
    isTranslated: boolean;
  };
  sourceAnalysis?: {
    userDocumentPercentage: number;
    externalSourcePercentage: number;
    totalDocumentsFound: number;
    totalVocabularyFound: number;
  };
  // SLA-specific fields
  slaMetadata?: {
    recastUsed: boolean;
    encouragement: string;
    learnerLevel: string;
    feedbackStyle: string;
    iPlusOneEnabled: boolean;
  };
}

const initialMessages: Message[] = [
  {
    id: "1",
    type: "ai",
    text: "Xin chào! 🇻🇳 Tôi là Viet-Talk AI - trợ lý học tiếng Việt theo phương pháp SLA (Second Language Acquisition)!\n\n🎯 Tôi sử dụng kỹ thuật **Recasting** - sửa lỗi tự nhiên không gây áp lực\n📈 Nguyên tắc **i+1** - nội dung vừa đủ thử thách cho bạn\n💚 **Affective Filter** - môi trường học thoải mái, vui vẻ\n\nHãy nói chuyện với tôi bằng tiếng Việt nhé! Đừng lo lắng về lỗi sai - đó là cách học tốt nhất! 😊",
    timestamp: new Date(),
    slaMetadata: {
      recastUsed: false,
      encouragement: "Chào mừng bạn! ",
      learnerLevel: "A2",
      feedbackStyle: "implicit",
      iPlusOneEnabled: true
    }
  },
];

export function useChat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Show typing indicator
    setIsTyping(true);

    try {
      // Get conversation history for context
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Call smart chat API
      const response = await fetch('/api/smart-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          conversationHistory
        })
      });

      const data = await response.json();

      if (data.success) {
        // Update user message with grammar correction if found
        if (data.grammarCheck) {
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === userMessage.id 
                ? {
                    ...msg,
                    hasCorrection: true,
                    correction: {
                      original: data.grammarCheck.original,
                      corrected: data.grammarCheck.corrected,
                      explanation: data.grammarCheck.explanation,
                      errors: data.grammarCheck.errors
                    }
                  }
                : msg
            )
          );
        }

        // Add AI response with SLA metadata
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          text: data.response,
          timestamp: new Date(),
          intent: data.intent?.intent,
          confidence: data.intent?.confidence,
          documentResults: data.documentResults,
          bilingualResponse: data.bilingualResponse,
          sourceAnalysis: data.sourceAnalysis,
          slaMetadata: data.slaMetadata
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        // Fallback response
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: "ai",
          text: "Xin lỗi, tôi gặp sự cố kỹ thuật. Bạn có thể thử lại không? 😅",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        text: "Xin lỗi, tôi không thể kết nối lúc này. Bạn có thể thử lại sau không? 🔄",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages(initialMessages);
  }, []);

  return {
    messages,
    isTyping,
    sendMessage,
    clearMessages,
  };
}
