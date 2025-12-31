import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserApiKeys from "@/app/models/UserApiKeys";

// GET - Lấy API keys của user (chỉ trả về có/không có key, không trả về key thật)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get('userId') || 'anonymous';

    const userKeys = await UserApiKeys.findOne({ userId });

    return NextResponse.json({
      success: true,
      userId,
      hasOpenaiKey: !!userKeys?.openaiKey,
      hasGeminiKey: !!userKeys?.geminiKey,
      hasGroqKey: !!userKeys?.groqKey,
      hasCohereKey: !!userKeys?.cohereKey,
      openaiKeyPreview: userKeys?.openaiKey ? `${userKeys.openaiKey.slice(0, 7)}...${userKeys.openaiKey.slice(-4)}` : null,
      geminiKeyPreview: userKeys?.geminiKey ? `${userKeys.geminiKey.slice(0, 7)}...${userKeys.geminiKey.slice(-4)}` : null,
      groqKeyPreview: userKeys?.groqKey ? `${userKeys.groqKey.slice(0, 7)}...${userKeys.groqKey.slice(-4)}` : null,
      cohereKeyPreview: userKeys?.cohereKey ? `${userKeys.cohereKey.slice(0, 7)}...${userKeys.cohereKey.slice(-4)}` : null,
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json({ success: false, message: 'Failed' }, { status: 500 });
  }
}

// POST - Lưu API keys của user
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId = 'anonymous', openaiKey, geminiKey, groqKey, cohereKey } = body;

    // Validate keys format (basic check)
    if (openaiKey && !openaiKey.startsWith('sk-')) {
      return NextResponse.json({ success: false, message: 'OpenAI key phải bắt đầu bằng sk-' }, { status: 400 });
    }
    if (geminiKey && !geminiKey.startsWith('AIza')) {
      return NextResponse.json({ success: false, message: 'Gemini key phải bắt đầu bằng AIza' }, { status: 400 });
    }
    if (groqKey && !groqKey.startsWith('gsk_')) {
      return NextResponse.json({ success: false, message: 'Groq key phải bắt đầu bằng gsk_' }, { status: 400 });
    }
    // Cohere keys don't have a specific prefix

    // Upsert - tạo mới hoặc cập nhật
    const updateData: Record<string, string> = {};
    if (openaiKey !== undefined) updateData.openaiKey = openaiKey;
    if (geminiKey !== undefined) updateData.geminiKey = geminiKey;
    if (groqKey !== undefined) updateData.groqKey = groqKey;
    if (cohereKey !== undefined) updateData.cohereKey = cohereKey;

    await UserApiKeys.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, message: 'API keys đã được lưu' });
  } catch (error) {
    console.error('Save API keys error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi lưu API key: ' + (error as Error).message }, { status: 500 });
  }
}

// DELETE - Xóa API keys của user
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const { userId = 'anonymous', keyType } = await req.json();

    const updateData: Record<string, string> = {};
    if (keyType === 'openai' || keyType === 'all') updateData.openaiKey = '';
    if (keyType === 'gemini' || keyType === 'all') updateData.geminiKey = '';
    if (keyType === 'groq' || keyType === 'all') updateData.groqKey = '';
    if (keyType === 'cohere' || keyType === 'all') updateData.cohereKey = '';

    await UserApiKeys.findOneAndUpdate({ userId }, { $set: updateData });

    return NextResponse.json({ success: true, message: 'API key đã được xóa' });
  } catch (error) {
    console.error('Delete API keys error:', error);
    return NextResponse.json({ success: false, message: 'Failed' }, { status: 500 });
  }
}
