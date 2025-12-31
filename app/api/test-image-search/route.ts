import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const word = searchParams.get('word') || 'lập trình';

    // Test the smart image search
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/smart-image-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: word,
        meaning: 'programming',
        type: 'danh từ',
        example: `Tôi đang học ${word} với Python.`
      })
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      testWord: word,
      result: data,
      message: `Test completed for word: ${word}`
    });

  } catch (error) {
    console.error("Test error:", error);
    return NextResponse.json(
      { success: false, message: "Test failed", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { words } = await req.json();
    const testWords = words || ['lập trình', 'máy tính', 'học tập', 'gia đình', 'chạy'];

    const results = [];

    for (const word of testWords) {
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/smart-image-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: word,
            meaning: `meaning of ${word}`,
            type: 'danh từ',
            example: `Đây là ví dụ với từ ${word}.`
          })
        });

        const data = await response.json();
        results.push({
          word,
          success: data.success,
          imageUrl: data.imageUrl,
          source: data.source,
          confidence: data.confidence,
          description: data.description
        });
      } catch (wordError) {
        results.push({
          word,
          success: false,
          error: wordError.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalTested: testWords.length,
      results,
      summary: {
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        averageConfidence: results
          .filter(r => r.confidence)
          .reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.confidence).length || 0
      }
    });

  } catch (error) {
    console.error("Batch test error:", error);
    return NextResponse.json(
      { success: false, message: "Batch test failed", error: error.message },
      { status: 500 }
    );
  }
}