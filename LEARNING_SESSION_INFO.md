# Thông tin về bảng LearningSession

## Mục đích
Bảng `LearningSession` thu thập và lưu trữ **dữ liệu chi tiết về các phiên học tập** của người dùng để:
- Theo dõi tiến độ học tập
- Phân tích điểm mạnh/yếu
- Đưa ra gợi ý cải thiện
- Hiển thị lịch sử học tập

---

## Các chức năng sử dụng LearningSession

### 1. **Voice Chat Live** (`components/VoiceChatLive.tsx`)
- **Loại phiên**: `voice_chat`
- **Thu thập**:
  - Lịch sử tin nhắn (user + AI)
  - Lỗi phát âm
  - Lỗi ngữ pháp
  - Từ vựng mới học
  - Điểm số (pronunciation, grammar, fluency)
  - Thời gian học (startTime, endTime, duration)
  - Số từ đã nói (wordsSpoken)

### 2. **English Live Chat** (`components/EnglishLiveChat.tsx`)
- **Loại phiên**: `voice_chat`
- **Thu thập**:
  - Tin nhắn hội thoại
  - Lỗi ngữ pháp được phát hiện
  - Từ vựng mới
  - Điểm số tổng hợp
  - Điểm mạnh (strengths)
  - Điểm cần cải thiện (areasToImprove)
  - Gợi ý (suggestions)

### 3. **Media Learning Enhanced** (`app/api/media-learning-enhanced/route.ts`)
- Lưu vào collection riêng: `mediaLearningSessions`
- Không dùng LearningSession model trực tiếp

---

## Cấu trúc dữ liệu thu thập

### Thông tin cơ bản
```typescript
{
  userId: string,              // ID người dùng
  sessionNumber: number,       // Số thứ tự phiên học
  sessionType: string,         // "voice_chat" | "pronunciation" | "vocabulary" | "debate" | "image_describe"
  startTime: Date,             // Thời gian bắt đầu
  endTime: Date,               // Thời gian kết thúc
  duration: number,            // Thời lượng (giây)
}
```

### Điểm số
```typescript
{
  overallScore: number,        // 0-100
  pronunciationScore: number,  // 0-100
  grammarScore: number,        // 0-100
  fluencyScore: number,        // 0-100
}
```

### Lỗi phát âm
```typescript
pronunciationErrors: [
  {
    word: string,                    // Từ bị sai
    userPronunciation: string,       // Cách user phát âm
    correctPronunciation: string,    // Cách phát âm đúng
    feedback: string                 // Phản hồi
  }
]
```

### Lỗi ngữ pháp
```typescript
grammarErrors: [
  {
    original: string,           // Câu gốc (sai)
    corrected: string,          // Câu đã sửa
    errorType: string,          // "tense", "article", "preposition", etc.
    explanation: string,        // Giải thích (tiếng Anh)
    explanationVi: string       // Giải thích (tiếng Việt)
  }
]
```

### Từ vựng mới học
```typescript
learnedVocabulary: [
  {
    word: string,               // Từ mới
    meaning: string,            // Nghĩa
    context: string             // Ngữ cảnh sử dụng
  }
]
```

### Lịch sử tin nhắn
```typescript
messages: [
  {
    role: "user" | "assistant",
    content: string,
    timestamp: Date,
    hasError: boolean           // Có lỗi không?
  }
]
```

### Thống kê
```typescript
{
  totalMessages: number,        // Tổng số tin nhắn
  userMessages: number,         // Số tin nhắn của user
  wordsSpoken: number,          // Số từ đã nói
  totalErrors: number,          // Tổng số lỗi
}
```

### Feedback
```typescript
{
  strengths: string[],          // Điểm mạnh
  areasToImprove: string[],     // Cần cải thiện
  suggestions: string[],        // Gợi ý
}
```

### Metadata
```typescript
{
  topic: string,                // Chủ đề
  level: string,                // Cấp độ
  rating: number,               // Đánh giá 1-5 sao
  createdAt: Date              // Ngày tạo
}
```

---

## API Endpoints

### POST `/api/learning-session`
**Lưu phiên học mới**
- Input: Tất cả các trường dữ liệu ở trên
- Output: `sessionId`, `sessionNumber`

### PATCH `/api/learning-session`
**Cập nhật rating**
- Input: `sessionId`, `rating` (1-5)
- Output: Session đã cập nhật

### GET `/api/learning-session?userId=xxx`
**Lấy lịch sử học tập**
- Query params:
  - `userId` (required)
  - `type` (optional): Lọc theo loại phiên
  - `limit` (optional): Số lượng phiên (default: 20)
  - `summary=true` (optional): Chỉ lấy thống kê tổng hợp

---

## Sử dụng trong Admin

### 1. **Thống kê tổng quan** (`app/api/admin/statistics/route.ts`)
- Tổng số phiên học của tất cả users
- Số phiên học 7 ngày gần đây
- Users hoạt động nhiều nhất

### 2. **Thống kê theo user** (`app/api/admin/statistics/[userId]/route.ts`)
- Tổng số phiên học của user
- 20 phiên gần nhất
- Thống kê theo ngày (30 ngày gần đây)
- Điểm số trung bình

### 3. **Quản lý users** (`app/api/admin/users/route.ts`)
- Hiển thị số phiên học của mỗi user
- Xóa tất cả phiên học khi xóa user

---

## Phân tích học tập

### API `/api/analyze-learning`
Sử dụng AI để phân tích:
- Xu hướng tiến bộ
- Lỗi phổ biến
- Điểm mạnh/yếu
- Gợi ý cải thiện cá nhân hóa

**Input**: `userId`, `days` (số ngày phân tích)
**Output**: Báo cáo chi tiết với insights từ AI

---

## Hiển thị cho người dùng

### Component `LearningHistory` (`components/LearningHistory.tsx`)
Hiển thị:
- Danh sách các phiên học
- Điểm số từng phiên
- Chi tiết lỗi
- Từ vựng đã học
- Xu hướng tiến bộ

### Page `/dashboard-new/learning-history`
Trang xem lịch sử học tập đầy đủ

---

## Tóm tắt

**LearningSession** là bảng trung tâm để:
1. ✅ Lưu trữ toàn bộ dữ liệu học tập
2. ✅ Theo dõi tiến độ theo thời gian
3. ✅ Phân tích điểm mạnh/yếu
4. ✅ Cung cấp feedback cá nhân hóa
5. ✅ Hỗ trợ admin quản lý và thống kê

**Hiện tại đang được sử dụng bởi**:
- Voice Chat Live
- English Live Chat
- (Có thể mở rộng cho: Pronunciation, Vocabulary, Debate, Image Describe)
