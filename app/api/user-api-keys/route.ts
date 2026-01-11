import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserApiKeys from "@/app/models/UserApiKeys";

// GET - Lấy API keys của user
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const userId = req.nextUrl.searchParams.get('userId') || 'anonymous';

    // Không cho phép anonymous xem keys
    if (userId === 'anonymous') {
      return NextResponse.json({
        success: false,
        message: "Vui lòng đăng nhập để xem API keys",
        requireLogin: true
      });
    }

    const userKeys = await UserApiKeys.findOne({ userId });

    if (!userKeys) {
      return NextResponse.json({
        success: true,
        userId,
        keys: {
          groqKey: "",
          openaiKey: "",
          geminiKey: "",
          cohereKey: ""
        },
        hasKeys: false
      });
    }

    // Trả về keys đầy đủ để hiển thị trong form (masked bởi frontend)
    return NextResponse.json({
      success: true,
      userId,
      keys: {
        groqKey: userKeys.groqKey || "",
        openaiKey: userKeys.openaiKey || "",
        geminiKey: userKeys.geminiKey || "",
        cohereKey: userKeys.cohereKey || ""
      },
      hasKeys: !!(userKeys.groqKey || userKeys.openaiKey || userKeys.geminiKey || userKeys.cohereKey),
      updatedAt: userKeys.updatedAt
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi server' }, { status: 500 });
  }
}

// POST - Lưu API keys của user
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, openaiKey, geminiKey, groqKey, cohereKey } = body;

    // Không cho phép anonymous lưu keys
    if (!userId || userId === 'anonymous') {
      return NextResponse.json({ 
        success: false, 
        message: 'Vui lòng đăng nhập để lưu API keys',
        requireLogin: true
      }, { status: 401 });
    }

    // Validate keys format (basic check) - chỉ validate nếu có giá trị
    if (openaiKey && openaiKey.trim() && !openaiKey.startsWith('sk-')) {
      return NextResponse.json({ success: false, message: 'OpenAI key phải bắt đầu bằng sk-' }, { status: 400 });
    }
    if (geminiKey && geminiKey.trim() && !geminiKey.startsWith('AIza')) {
      return NextResponse.json({ success: false, message: 'Gemini key phải bắt đầu bằng AIza' }, { status: 400 });
    }
    if (groqKey && groqKey.trim() && !groqKey.startsWith('gsk_')) {
      return NextResponse.json({ success: false, message: 'Groq key phải bắt đầu bằng gsk_' }, { status: 400 });
    }

    // Upsert - tạo mới hoặc cập nhật
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };
    
    // Chỉ cập nhật key nếu được gửi lên (không undefined)
    if (openaiKey !== undefined) updateData.openaiKey = openaiKey || "";
    if (geminiKey !== undefined) updateData.geminiKey = geminiKey || "";
    if (groqKey !== undefined) updateData.groqKey = groqKey || "";
    if (cohereKey !== undefined) updateData.cohereKey = cohereKey || "";

    await UserApiKeys.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { upsert: true, new: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'API keys đã được lưu thành công!',
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Save API keys error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi lưu API key: ' + (error as Error).message }, { status: 500 });
  }
}

// DELETE - Xóa API keys của user
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { userId, provider } = body;

    if (!userId || userId === 'anonymous') {
      return NextResponse.json({ 
        success: false, 
        message: 'Vui lòng đăng nhập để xóa API keys',
        requireLogin: true
      }, { status: 401 });
    }

    const updateData: Record<string, string> = {};
    
    // Xóa theo provider cụ thể hoặc tất cả
    if (provider === 'openai' || provider === 'all') updateData.openaiKey = '';
    if (provider === 'gemini' || provider === 'all') updateData.geminiKey = '';
    if (provider === 'groq' || provider === 'all') updateData.groqKey = '';
    if (provider === 'cohere' || provider === 'all') updateData.cohereKey = '';

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: 'Provider không hợp lệ' }, { status: 400 });
    }

    await UserApiKeys.findOneAndUpdate({ userId }, { $set: updateData });

    const providerNames: Record<string, string> = {
      openai: 'OpenAI',
      gemini: 'Gemini', 
      groq: 'Groq',
      cohere: 'Cohere',
      all: 'Tất cả'
    };

    return NextResponse.json({ 
      success: true, 
      message: `Đã xóa ${providerNames[provider] || provider} API key` 
    });
  } catch (error) {
    console.error('Delete API keys error:', error);
    return NextResponse.json({ success: false, message: 'Lỗi xóa API key' }, { status: 500 });
  }
}
