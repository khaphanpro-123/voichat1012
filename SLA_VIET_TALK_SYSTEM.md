# 🎓 VIET-TALK AI - SLA System Implementation

## Hệ thống dạy tiếng Việt dựa trên lý thuyết Krashen

---

## 📚 LÝ THUYẾT NỀN TẢNG

### Stephen Krashen's Second Language Acquisition (SLA) Theory

Hệ thống Viet-Talk AI được xây dựng dựa trên 5 giả thuyết chính của Krashen:

### 1. 📈 Comprehensible Input (i+1)
**Nguyên tắc**: Input phải cao hơn một chút so với level hiện tại của người học.

**Triển khai trong code**:
```typescript
// lib/slaSystemPrompt.ts
const LEVEL_GUIDELINES = {
  A1: {
    iPlusOne: 'Thêm 1-2 từ mới mỗi câu, giải thích ngay',
    sentenceLength: '5-10 từ'
  },
  A2: {
    iPlusOne: 'Giới thiệu cấu trúc mới trong ngữ cảnh quen thuộc',
    sentenceLength: '10-15 từ'
  },
  // ...
};
```

### 2. 🔄 Recasting (Implicit Correction)
**Nguyên tắc**: Sửa lỗi gián tiếp thông qua việc nhắc lại đúng, không chỉ trích trực tiếp.

**So sánh**:
| ❌ Sửa lỗi trực tiếp | ✅ Recasting |
|---------------------|--------------|
| "Sai rồi! Phải nói là..." | "À, ý bạn là [đúng] phải không?" |
| "Bạn mắc lỗi ngữ pháp" | "Vâng, [đúng] - đúng vậy!" |
| "Câu này sai" | "Tôi hiểu! [đúng] là cách nói tự nhiên" |

**Triển khai**:
```typescript
const RECASTING_TEMPLATES = {
  grammar: [
    'À, ý bạn là "{corrected}" phải không? 😊',
    'Tôi hiểu rồi! Bạn muốn nói "{corrected}" đúng không?',
  ],
  // ...
};
```

### 3. 💚 Affective Filter
**Nguyên tắc**: Giảm lo lắng, tăng động lực để não bộ tiếp nhận ngôn ngữ tốt hơn.

**Triển khai**:
```typescript
const ENCOURAGEMENT_PHRASES = {
  success: ['Tuyệt vời! 🎉', 'Giỏi lắm! 👏', 'Chính xác! ✨'],
  effort: ['Cố gắng tốt lắm! 💪', 'Bạn đang tiến bộ! 📈'],
  mistake: ['Không sao, ai cũng mắc lỗi khi học! 😊']
};
```

### 4. 📊 Natural Order Hypothesis
**Nguyên tắc**: Ngôn ngữ được thụ đắc theo thứ tự tự nhiên.

**Thứ tự trong tiếng Việt**:
1. Từ vựng cơ bản → Cụm từ → Câu đơn
2. Thì hiện tại → Quá khứ → Tương lai
3. Câu khẳng định → Câu hỏi → Câu phức

### 5. 🧠 Monitor Hypothesis
**Nguyên tắc**: Kiến thức có ý thức (learning) hỗ trợ cho thụ đắc (acquisition).

**Triển khai**: Chỉ giải thích ngữ pháp khi:
- Người học hỏi trực tiếp
- Lỗi lặp lại 3+ lần
- Level B1+ có thể hiểu được

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Files chính:

```
lib/
└── slaSystemPrompt.ts    # Core SLA logic & prompts

app/api/
└── smart-chat/
    └── route.ts          # API với SLA integration

hooks/
└── useChat.ts            # Chat hook với SLA metadata

components/
└── ChatScreen.tsx        # UI hiển thị SLA indicators
```

### Flow xử lý:

```
User Input
    ↓
Intent Analysis (Phân tích ý định)
    ↓
Grammar Check (Kiểm tra ngữ pháp)
    ↓
SLA System Prompt Generation
    ├── i+1 Calculation
    ├── Recasting Decision
    └── Affective Filter
    ↓
GPT-4o Response
    ↓
Response with SLA Metadata
    ↓
UI Display (với indicators)
```

---

## 🎯 TÍNH NĂNG ĐÃ TRIỂN KHAI

### ✅ Recasting System
- Tự động phát hiện lỗi ngữ pháp
- Sửa lỗi gián tiếp qua reformulation
- Templates đa dạng cho từng loại lỗi

### ✅ i+1 Adaptive Content
- 6 levels: A1 → C2
- Vocabulary phù hợp từng level
- Sentence complexity tăng dần

### ✅ Affective Filter
- Encouragement phrases tự động
- Tone thân thiện, không áp lực
- Emoji và ngôn ngữ tích cực

### ✅ SLA Metadata Display
- Recasting indicator (🔄)
- Level indicator (📊 A2)
- Feedback style indicator

---

## 📊 LEARNER PROFILE

```typescript
interface LearnerProfile {
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  nativeLanguage: string;
  learningGoals: string[];
  weakAreas: string[];
  strongAreas: string[];
  conversationCount: number;
  lastTopics: string[];
}
```

### Default Profile:
```typescript
const DEFAULT_LEARNER_PROFILE: LearnerProfile = {
  level: 'A2',
  nativeLanguage: 'English',
  learningGoals: ['Giao tiếp hàng ngày', 'Du lịch Việt Nam'],
  weakAreas: ['Dấu thanh', 'Ngữ pháp'],
  strongAreas: ['Từ vựng cơ bản'],
  conversationCount: 0,
  lastTopics: []
};
```

---

## ⚙️ SLA CONFIGURATION

```typescript
interface SLAConfig {
  enableRecasting: boolean;      // Bật/tắt recasting
  enableIPlusOne: boolean;       // Bật/tắt i+1
  enableAffectiveFilter: boolean; // Bật/tắt encouragement
  feedbackStyle: 'implicit' | 'explicit' | 'mixed';
  correctionFrequency: 'always' | 'sometimes' | 'rarely';
}
```

### Current Settings:
```typescript
const SLA_CONFIG: SLAConfig = {
  enableRecasting: true,
  enableIPlusOne: true,
  enableAffectiveFilter: true,
  feedbackStyle: 'implicit',
  correctionFrequency: 'sometimes'
};
```

---

## 🚀 CÁCH SỬ DỤNG

### 1. Truy cập Chat
```
http://localhost:3000/dashboard-new/chat
```

### 2. Nói chuyện tiếng Việt
- Gõ hoặc nói tiếng Việt
- AI sẽ tự động áp dụng SLA principles
- Xem indicators để biết AI đang làm gì

### 3. Quan sát Recasting
Khi bạn mắc lỗi, AI sẽ:
- KHÔNG nói "Sai rồi!"
- Tự nhiên nhắc lại câu đúng
- Tiếp tục hội thoại bình thường

---

## 📈 SO SÁNH: TRƯỚC vs SAU SLA

### Trước (Traditional):
```
User: "Tôi đi chợ hôm qua mua rau cải"
AI: "Bạn mắc lỗi! 'rau cải' không tự nhiên. 
     Phải nói 'rau' hoặc 'cải'. 
     Ngữ pháp: [giải thích dài]..."
```

### Sau (SLA Recasting):
```
User: "Tôi đi chợ hôm qua mua rau cải"
AI: "Hay quá! 👏 Hôm qua bạn đi chợ mua rau à? 
     Bạn mua những loại rau gì? 🥬"
```

**Khác biệt**:
- ✅ Không chỉ trích trực tiếp
- ✅ Tự nhiên nhắc lại đúng ("rau" thay vì "rau cải")
- ✅ Tiếp tục hội thoại
- ✅ Khuyến khích nói thêm

---

## 🔬 CHO LUẬN VĂN

### Điểm mạnh để trình bày:

1. **Cơ sở lý thuyết vững chắc**
   - Dựa trên Krashen's SLA Theory
   - Có nghiên cứu khoa học hỗ trợ

2. **Triển khai kỹ thuật**
   - System Prompt engineering
   - Real-time error detection
   - Adaptive content generation

3. **Đánh giá hiệu quả**
   - So sánh với phương pháp truyền thống
   - Metrics: engagement, error reduction, confidence

4. **Tính ứng dụng**
   - Scalable cho nhiều ngôn ngữ
   - Customizable cho từng learner

### Gợi ý nghiên cứu:
- A/B testing: Recasting vs Direct Correction
- User satisfaction survey
- Learning outcome measurement
- Long-term retention study

---

## 📁 FILES REFERENCE

| File | Mô tả |
|------|-------|
| `lib/slaSystemPrompt.ts` | Core SLA logic, prompts, templates |
| `app/api/smart-chat/route.ts` | API endpoint với SLA integration |
| `hooks/useChat.ts` | React hook với SLA metadata |
| `components/ChatScreen.tsx` | UI với SLA indicators |

---

## ✅ STATUS

**Implemented**: ✅ Complete
**Tested**: ✅ No errors
**Server**: Running on http://localhost:3000

---

**Version**: 1.0.0
**Last Updated**: December 2024
**Based on**: Krashen's SLA Theory (1982)
