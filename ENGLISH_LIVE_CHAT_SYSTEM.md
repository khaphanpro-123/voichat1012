# 🎤 ENGLISH LIVE CHAT - Gemini Live Style

## Hệ thống luyện nói tiếng Anh cho người Việt

---

## 🎯 TỔNG QUAN

**English Live Chat** là module luyện nói tiếng Anh tương tác real-time, lấy cảm hứng từ **Gemini Live** của Google. Hệ thống sử dụng:

- **OpenAI Whisper** - Nhận dạng giọng nói
- **GPT-4o** - Xử lý hội thoại với SLA principles
- **OpenAI TTS** - Phản hồi bằng giọng nói tự nhiên
- **Krashen's SLA Theory** - Phương pháp dạy ngôn ngữ khoa học

---

## 🚀 TRUY CẬP

```
http://localhost:3000/dashboard-new/english-live
```

---

## ✨ TÍNH NĂNG

### 1. 🎙️ Real-time Voice Chat
- Nói tiếng Anh, nhận phản hồi bằng giọng nói
- Hiển thị transcript real-time khi đang nói
- Auto-play phản hồi của AI

### 2. 🔄 Recasting (Sửa lỗi gián tiếp)
- AI KHÔNG nói "Bạn sai rồi"
- Tự nhiên nhắc lại câu đúng trong phản hồi
- Giảm áp lực, tăng tự tin

### 3. 📈 i+1 Comprehensible Input
- Nội dung vừa đủ thử thách
- Từ vựng mới được giới thiệu trong ngữ cảnh
- Tăng dần độ khó theo level

### 4. 🇻🇳 Vietnamese Support
- Giải thích tiếng Việt cho người mới
- Có thể bật/tắt theo nhu cầu
- Tự động giảm khi level cao hơn

### 5. 🎚️ Adaptive Levels (A1-C2)
- A1: Beginner - Rất chậm, nhiều hỗ trợ
- A2: Elementary - Chậm, hỗ trợ khi cần
- B1: Intermediate - Bình thường
- B2: Upper Intermediate - Tự nhiên
- C1/C2: Advanced - Như người bản xứ

---

## 🏗️ KIẾN TRÚC

### Files:

```
lib/
└── englishSLAPrompt.ts      # SLA logic cho English

app/api/
└── english-live-chat/
    └── route.ts             # API endpoint

components/
└── EnglishLiveChat.tsx      # UI component

app/dashboard-new/
└── english-live/
    └── page.tsx             # Page route
```

### Flow:

```
User speaks English
    ↓
MediaRecorder captures audio
    ↓
Whisper transcribes → text
    ↓
Grammar analysis (Vietnamese mistakes)
    ↓
GPT-4o generates response (with SLA)
    ↓
TTS converts to speech
    ↓
Auto-play response
    ↓
User continues conversation
```

---

## 🧠 SLA PRINCIPLES APPLIED

### 1. Comprehensible Input (i+1)

```typescript
// Level A2 example
// User knows: "I like coffee"
// AI response: "I like coffee too! Do you prefer hot coffee or iced coffee?"
// i+1: Introduces "prefer" and question structure
```

### 2. Recasting

```typescript
// User: "I go to school yesterday"
// ❌ Wrong: "That's incorrect. You should say 'went'"
// ✅ Recasting: "Oh, you went to school yesterday? What did you do there?"
```

### 3. Affective Filter

```typescript
const ENCOURAGEMENT = {
  success: ["Excellent! 🎉", "Perfect! 👏", "Great job! ⭐"],
  effort: ["Good try! 💪", "You're improving! 📈"],
  mistake: ["No worries, let's try again! 😊"]
};
```

### 4. Vietnamese Learner Focus

```typescript
// Common mistakes for Vietnamese speakers:
const VIETNAMESE_MISTAKES = {
  grammar: [
    { mistake: 'Missing articles', correct: 'I go to THE school' },
    { mistake: 'Missing -s/-es', correct: 'She GOES to work' },
    { mistake: 'Wrong tense', correct: 'I WENT yesterday' },
    { mistake: 'Missing to-be', correct: 'I AM a student' },
  ]
};
```

---

## ⚙️ CONFIGURATION

### Learner Profile:

```typescript
interface LearnerProfile {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  vietnameseSupport: boolean;  // Bật/tắt hỗ trợ tiếng Việt
  speakingSpeed: 'slow' | 'normal' | 'fast';
}
```

### Default Settings:

```typescript
const DEFAULT_PROFILE = {
  level: 'A2',
  vietnameseSupport: true,
  speakingSpeed: 'slow'
};
```

---

## 📊 API ENDPOINTS

### POST /api/english-live-chat

#### Action: start
```json
{
  "action": "start",
  "learnerProfile": { "level": "A2", ... },
  "config": { "enableRecasting": true, ... }
}
```

Response:
```json
{
  "success": true,
  "message": "Hi there! 👋 I'm your English tutor...",
  "audioUrl": "data:audio/mp3;base64,..."
}
```

#### Action: voice
```json
{
  "action": "voice",
  "audioBase64": "...",
  "conversationHistory": [...]
}
```

Response:
```json
{
  "success": true,
  "transcription": "I go to school yesterday",
  "response": "Oh, you went to school yesterday? What did you do there?",
  "audioUrl": "data:audio/mp3;base64,...",
  "grammarAnalysis": {
    "hasErrors": true,
    "errors": [{ "type": "tense", "original": "go", "corrected": "went" }]
  },
  "slaMetadata": {
    "recastUsed": true,
    "encouragement": "Good try! 💪"
  }
}
```

#### Action: chat
```json
{
  "action": "chat",
  "message": "I like coffee",
  "conversationHistory": [...]
}
```

---

## 🎨 UI FEATURES

### 1. Start Screen
- Gradient background (blue → purple)
- Level selection
- Start button với animation

### 2. Chat Interface
- Message bubbles (user: blue, AI: glass effect)
- Real-time transcript khi đang nói
- Audio player cho mỗi AI message
- Grammar correction tooltips

### 3. Voice Control
- Large mic button (center)
- Listening indicator (red pulse)
- Processing indicator (dots animation)

### 4. Settings Panel
- Level selector (A1-C2)
- Speaking speed (slow/normal/fast)
- Vietnamese support toggle

---

## 🔧 TECHNICAL DETAILS

### Audio Recording:
```typescript
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus'
});
```

### Speech Recognition (for real-time transcript):
```typescript
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';
```

### TTS Configuration:
```typescript
const response = await openai.audio.speech.create({
  model: 'tts-1',
  voice: 'nova',  // Friendly female voice
  input: text,
  speed: 0.85,    // Slow for beginners
  response_format: 'mp3'
});
```

---

## 📈 SO SÁNH VỚI GEMINI LIVE

| Feature | Gemini Live | English Live Chat |
|---------|-------------|-------------------|
| Real-time voice | ✅ | ✅ |
| Natural conversation | ✅ | ✅ |
| Language learning focus | ❌ | ✅ |
| SLA methodology | ❌ | ✅ |
| Vietnamese support | ❌ | ✅ |
| Grammar correction | ❌ | ✅ (Recasting) |
| Adaptive levels | ❌ | ✅ (A1-C2) |
| Offline mode | ❌ | ❌ |

---

## 🎯 USE CASES

### 1. Daily Conversation Practice
- Nói về cuộc sống hàng ngày
- Luyện small talk
- Thực hành giao tiếp cơ bản

### 2. Interview Preparation
- Luyện trả lời phỏng vấn
- Thực hành self-introduction
- Cải thiện fluency

### 3. Travel English
- Đặt phòng khách sạn
- Gọi món ăn
- Hỏi đường

### 4. Business English
- Email communication
- Meeting discussions
- Presentations

---

## 🚀 QUICK START

1. **Truy cập**: http://localhost:3000/dashboard-new/english-live

2. **Chọn Level**: A1-C2 (mặc định A2)

3. **Bật Vietnamese Support**: Nếu cần giải thích tiếng Việt

4. **Click "Start Conversation"**

5. **Tap mic button** và nói tiếng Anh

6. **Nghe phản hồi** của AI

7. **Tiếp tục hội thoại** tự nhiên!

---

## 💡 TIPS FOR LEARNERS

### Cho người mới (A1-A2):
- Bật Vietnamese Support
- Chọn Speaking Speed: Slow
- Bắt đầu với câu đơn giản
- Đừng lo lắng về lỗi sai!

### Cho người trung cấp (B1-B2):
- Tắt Vietnamese Support
- Chọn Speaking Speed: Normal
- Thử nói về topics phức tạp hơn
- Chú ý đến recasting của AI

### Cho người nâng cao (C1-C2):
- Speaking Speed: Fast
- Thảo luận về abstract topics
- Chú ý đến nuances và idioms

---

## ✅ STATUS

**Implemented**: ✅ Complete
**Tested**: ✅ No errors
**Server**: http://localhost:3000

---

**Version**: 1.0.0
**Last Updated**: December 2024
**Based on**: Krashen's SLA Theory + Gemini Live UX
