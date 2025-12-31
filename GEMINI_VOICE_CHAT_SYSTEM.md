# 🎤 GEMINI VOICE CHAT - English Learning System

## Hệ thống luyện nói tiếng Anh với Google Gemini AI

---

## 🎯 TỔNG QUAN

**Gemini Voice Chat** là module luyện nói tiếng Anh real-time sử dụng:

- **Google Gemini 1.5 Flash** - AI nhanh, thông minh
- **Web Speech API** - Nhận dạng giọng nói trong browser
- **Browser TTS** - Phản hồi bằng giọng nói
- **Krashen's SLA Theory** - Phương pháp dạy ngôn ngữ khoa học

---

## 🚀 TRUY CẬP

```
http://localhost:3000/dashboard-new/chat
```

---

## ⚙️ CẤU HÌNH

### 1. Lấy Google Gemini API Key

1. Truy cập: https://aistudio.google.com/app/apikey
2. Đăng nhập Google Account
3. Click "Create API Key"
4. Copy API Key

### 2. Thêm vào .env

```env
GOOGLE_GEMINI_API_KEY=your-api-key-here
```

### 3. Restart server

```bash
npm run dev
```

---

## ✨ TÍNH NĂNG

### 1. 🎙️ Voice Input
- Nhấn nút mic để nói tiếng Anh
- Real-time transcript hiển thị khi đang nói
- Tự động gửi khi dừng nói

### 2. ⌨️ Text Input
- Gõ tiếng Anh trong ô input
- Nhấn Enter hoặc nút Send
- Hỗ trợ cả voice và text

### 3. 🔊 Voice Output
- AI phản hồi bằng giọng nói tự nhiên
- Tốc độ điều chỉnh theo level
- Nút Play/Stop cho mỗi message

### 4. 🔄 Recasting (SLA)
- Sửa lỗi gián tiếp, không chỉ trích
- AI tự nhiên nhắc lại câu đúng
- Giảm áp lực, tăng tự tin

### 5. 🇻🇳 Vietnamese Support
- Giải thích tiếng Việt cho người mới
- Bật/tắt theo nhu cầu
- Tự động giảm khi level cao

### 6. 📊 Adaptive Levels (A1-C2)
- A1: Beginner - Rất chậm
- A2: Elementary - Chậm
- B1: Intermediate - Bình thường
- B2: Upper Intermediate - Tự nhiên
- C1/C2: Advanced - Như người bản xứ

---

## 🏗️ KIẾN TRÚC

### Files:

```
lib/
└── englishSLAPrompt.ts        # SLA logic cho English

app/api/
└── gemini-voice-chat/
    └── route.ts               # Gemini API endpoint

components/
└── GeminiVoiceChat.tsx        # UI component

app/dashboard-new/
└── chat/
    └── page.tsx               # Chat page (updated)
```

### Flow:

```
User speaks/types English
    ↓
Web Speech API captures voice
    ↓
Gemini analyzes grammar
    ↓
Gemini generates response (with SLA)
    ↓
Browser TTS speaks response
    ↓
User continues conversation
```

---

## 📊 API ENDPOINTS

### GET /api/gemini-voice-chat
Kiểm tra status và configuration.

### POST /api/gemini-voice-chat

#### Action: start
```json
{
  "action": "start",
  "learnerProfile": { "level": "A2", ... },
  "config": { "enableRecasting": true, ... }
}
```

#### Action: chat
```json
{
  "action": "chat",
  "message": "I go to school yesterday",
  "conversationHistory": [...]
}
```

Response:
```json
{
  "success": true,
  "response": "Oh, you went to school yesterday? What did you do there?",
  "grammarAnalysis": {
    "hasErrors": true,
    "errors": [{ "type": "tense", "original": "go", "corrected": "went" }]
  },
  "slaMetadata": {
    "recastUsed": true,
    "model": "gemini-1.5-flash"
  }
}
```

---

## 🎨 UI FEATURES

### Start Screen
- Gradient background (indigo → purple → pink)
- Level selection
- Animated start button

### Chat Interface
- Message bubbles với glass effect
- Real-time transcript
- Play/Stop buttons
- Grammar correction tooltips

### Settings Panel
- Level selector (A1-C2)
- Speaking speed (slow/normal/fast)
- Vietnamese support toggle

---

## 🔧 TECHNICAL DETAILS

### Speech Recognition:
```typescript
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';
```

### Text-to-Speech:
```typescript
const utterance = new SpeechSynthesisUtterance(text);
utterance.rate = 0.8;  // Slow for beginners
utterance.lang = 'en-US';
speechSynthesis.speak(utterance);
```

### Gemini Model:
```typescript
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash" 
});
```

---

## 📈 SO SÁNH: OpenAI vs Gemini

| Feature | OpenAI | Gemini |
|---------|--------|--------|
| Model | GPT-4o-mini | Gemini 1.5 Flash |
| Speed | Fast | Very Fast |
| Cost | $0.15/1M tokens | Free tier available |
| TTS | OpenAI TTS (paid) | Browser TTS (free) |
| STT | Whisper (paid) | Web Speech API (free) |
| Quality | Excellent | Very Good |

---

## 💡 TIPS FOR USERS

### Cho người mới (A1-A2):
- Bật Vietnamese Support
- Chọn Speaking Speed: Slow
- Bắt đầu với câu đơn giản
- Đừng lo lắng về lỗi sai!

### Cho người trung cấp (B1-B2):
- Tắt Vietnamese Support
- Chọn Speaking Speed: Normal
- Thử topics phức tạp hơn

### Cho người nâng cao (C1-C2):
- Speaking Speed: Fast
- Thảo luận abstract topics
- Chú ý idioms và nuances

---

## ⚠️ TROUBLESHOOTING

### "API Key Missing"
- Thêm `GOOGLE_GEMINI_API_KEY` vào `.env`
- Lấy key từ: https://aistudio.google.com/app/apikey

### "Microphone not working"
- Cho phép microphone trong browser
- Sử dụng Chrome (best support)
- Kiểm tra microphone settings

### "Voice not playing"
- Kiểm tra volume
- Thử click Play button
- Refresh page

---

## ✅ STATUS

**Implemented**: ✅ Complete
**Tested**: ✅ No errors
**API**: Gemini 1.5 Flash
**URL**: http://localhost:3000/dashboard-new/chat

---

## 🔑 SETUP CHECKLIST

- [ ] Get Gemini API Key from https://aistudio.google.com/app/apikey
- [ ] Add to `.env`: `GOOGLE_GEMINI_API_KEY=your-key`
- [ ] Restart server: `npm run dev`
- [ ] Navigate to: http://localhost:3000/dashboard-new/chat
- [ ] Allow microphone access
- [ ] Start practicing! 🎉

---

**Version**: 1.0.0
**Last Updated**: December 2024
**Model**: Google Gemini 1.5 Flash
**Based on**: Krashen's SLA Theory
