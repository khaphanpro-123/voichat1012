import { NextResponse } from "next/server";
import mongoose, { Schema, Model } from "mongoose";

const MONGO_URI = process.env.MONGO_URI as string;

// Khởi tạo một biến toàn cục để theo dõi trạng thái kết nối
let isConnected: boolean = false;

// Hàm kết nối đến cơ sở dữ liệu
async function connectDB(): Promise<void> {
    // Nếu đã kết nối, không làm gì nữa
    if (isConnected) {
        console.log(" MongoDB đã được kết nối");
        return;
    }

    // Kiểm tra biến môi trường MONGO_URI
    if (!MONGO_URI) {
        throw new Error(" MONGO_URI chưa được cấu hình trong .env");
    }

    try {
        // Thử kết nối với MongoDB
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log(" MongoDB đã được kết nối thành công");
    } catch (error) {
        console.error(" Lỗi kết nối MongoDB:", error);
        // Ném lỗi để được xử lý bởi khối catch chính
        throw new Error("Không thể kết nối với cơ sở dữ liệu");
    }
}

// Định nghĩa lược đồ (Schema) cho các bản nộp
const SubmissionSchema = new Schema(
    {
        parentName: String,
        childName: String,
        childAge: Number,
        ageGroup: String,
        answers: Schema.Types.Mixed,
        essays: Schema.Types.Mixed,
        domainScores: Array,
        overallRisk: Number,
        timestamp: String,
    },
    { _id: false }
);

// Định nghĩa lược đồ chính cho dữ liệu người dùng
const UserDataSchema = new Schema(
    {
        userId: { type: String, required: false, unique: true },
        submissions: [SubmissionSchema],
    },
    { _id: false }
);

// Tạo mô hình (Model)
const UserData: Model<any> =
    mongoose.models.UserData || mongoose.model("UserData", UserDataSchema);

export async function POST(req: Request) {
    try {
        // Cố gắng kết nối với DB
        await connectDB();
        const body = await req.json();
        const { userId, ...submissionData } = body;

        // Xác thực userId
        // if (!userId || typeof userId !== 'string') {
        //   return NextResponse.json(
        //     { success: false, message: "User ID hợp lệ là bắt buộc" },
        //     { status: 400 }
        //   );}
    
    // Tìm hoặc tạo tài liệu người dùng và lưu dữ liệu mới
    const user = await UserData.findOneAndUpdate(
        { userId },
        { $push: { submissions: submissionData } },
        { new: true, upsert: true } // `upsert: true` sẽ tạo tài liệu nếu nó chưa tồn tại
    );

    if (!user) {
        return NextResponse.json(
            { success: false, message: "Không thể lưu dữ liệu người dùng" },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        message: "Đã lưu dữ liệu thành công!",
    });
} catch (error) {
    console.error("Lỗi xử lý yêu cầu:", error);
    // Trả về phản hồi JSON với lỗi 500 để frontend có thể xử lý
    return NextResponse.json(
        { success: false, message: "Lỗi nội bộ máy chủ. Vui lòng thử lại sau." },
        { status: 500 }
    );
}
}