import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const message = searchParams.get('message') || 'toi di cho';

    // Test the smart chat API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/smart-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        conversationHistory: []
      })
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      testMessage: message,
      result: data,
      message: `Smart chat test completed for: "${message}"`
    });

  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { success: false, message: "Test failed", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { testMessages } = await req.json();
    const messages = testMessages || [
      'toi di cho',
      'xin chao',
      'cam on ban',
      'Tôi muốn học từ vựng',
      'Làm thế nào để phát âm đúng?',
      'Tìm tài liệu về ngữ pháp tiếng Việt',
      'Dịch câu này sang tiếng Anh: Tôi yêu Việt Nam'
    ];

    const results = [];

    for (const message of messages) {
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/smart-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            conversationHistory: []
          })
        });

        const data = await response.json();
        results.push({
          input: message,
          success: data.success,
          response: data.response,
          intent: data.intent?.intent,
          confidence: data.intent?.confidence,
          hasGrammarErrors: data.metadata?.hasGrammarErrors,
          foundDocuments: data.metadata?.foundDocuments
        });
      } catch (messageError) {
        results.push({
          input: message,
          success: false,
          error: (messageError as Error).message
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalTested: messages.length,
      results,
      summary: {
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        withGrammarErrors: results.filter(r => r.hasGrammarErrors).length,
        withDocuments: results.filter(r => r.foundDocuments > 0).length,
        averageConfidence: results
          .filter(r => r.confidence)
          .reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.confidence).length || 0
      }
    });

  } catch (error) {
    console.error("Batch test error:", error);
    return NextResponse.json(
      { success: false, message: "Batch test failed", error: (error as Error).message },
      { status: 500 }
    );
  }
}