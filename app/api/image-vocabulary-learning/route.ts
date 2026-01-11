import { NextRequest, NextResponse } from "next/server";
import { getUserApiKeys } from "@/lib/getUserApiKey";
import { callAI, parseJsonFromAI } from "@/lib/aiProvider";
import { connectDB } from "@/lib/db";

/**
 * Image Vocabulary Learning API
 * 
 * Flow:
 * 1. Identify main object in image (with vision API)
 * 2. User inputs vocabulary guess
 * 3. User writes 4 sentences
 * 4. Check each sentence (grammar, spelling)
 * 5. Add sample sentences if needed
 * 6. Analyze sentence structures
 * 7. Save vocabulary, structures, errors
 * 8. Display final results
 */

// Step 1: Identify object in image (with vision)
const IDENTIFY_PROMPT = `You are a language learning assistant. Analyze this image and identify the main object.

Return ONLY valid JSON:
{
  "mainObject": {
    "english": "dog",
    "vietnamese": "con chó",
    "partOfSpeech": "noun",
    "pronunciation": "/dɔːɡ/"
  },
  "relatedWords": [
    { "english": "puppy", "vietnamese": "chó con" },
    { "english": "bark", "vietnamese": "sủa" }
  ]
}`;

// Step 4: Check sentence - Detailed grammar analysis for Vietnamese learners
const CHECK_SENTENCE_PROMPT = `Bạn là trợ lý học tiếng Anh thân thiện cho người Việt.

NHIỆM VỤ: Kiểm tra câu tiếng Anh có chứa từ gốc "{word}" hoặc biến thể của nó.

Câu người dùng nhập: "{sentence}"

---
### BƯỚC 1: Kiểm tra từ gốc và biến thể

**Từ gốc**: "{word}"
**Biến thể hợp lệ** (tự động sinh từ từ gốc):
- Danh từ số nhiều: {word}s, {word}es
- Động từ ngôi 3: {word}s
- V-ing: {word}ing (bỏ e nếu có: swim→swimming, run→running)
- V-ed/V2/V3: {word}ed, hoặc bất quy tắc (swim→swam→swum, run→ran→run)
- Danh từ chỉ người: {word}er, {word}or (swim→swimmer, run→runner)

**Quy tắc**: Câu hợp lệ nếu chứa BẤT KỲ biến thể nào của từ gốc (không phân biệt hoa/thường).

Nếu KHÔNG có từ gốc hoặc biến thể → hasTargetWord: false, dừng kiểm tra ngữ pháp.

---
### BƯỚC 2: Phân tích lỗi ngữ pháp CHI TIẾT

Với MỖI lỗi phát hiện, phải chỉ rõ:
- **errorWord**: từ/cụm từ sai cụ thể
- **errorPosition**: vị trí trong câu (đầu câu/giữa câu/cuối câu/sau động từ...)
- **errorIndex**: vị trí từ (số thứ tự từ trong câu, bắt đầu từ 0)
- **errorMessage**: mô tả ngắn gọn lỗi bằng tiếng Việt
- **suggestion**: gợi ý sửa cụ thể

DANH SÁCH LỖI CẦN KIỂM TRA:

1. **SAI DẠNG SAU ĐỘNG TỪ THÁI ĐỘ (verb_form_after_attitude)**
   - Quy tắc: like/love/hate/prefer/enjoy + V-ing HOẶC to V
   - Sai: "I love swim" → Đúng: "I love swimming." hoặc "I love to swim."
   - errorWord: "swim", errorMessage: "Sau 'love' cần dùng 'swimming' hoặc 'to swim'"

2. **CHIA ĐỘNG TỪ HIỆN TẠI ĐƠN (subject_verb_agreement)**
   - Quy tắc: Ngôi 3 số ít (he/she/it) → động từ thêm -s/-es
   - Sai: "She swim fast." → Đúng: "She swims fast."
   - errorWord: "swim", errorMessage: "Ngôi 3 số ít cần 'swims'"

3. **THIẾU CHỦ NGỮ (missing_subject)**
   - Quy tắc: Câu cần chủ ngữ rõ ràng (trừ mệnh lệnh)
   - Sai: "Swim don't like it." → Đúng: "I don't like swimming."
   - errorWord: "(thiếu)", errorMessage: "Câu cần chủ ngữ rõ ràng"

4. **CÂU HỎI YES/NO (question_form)**
   - Quy tắc: Do/Does + S + V(base)? | Did + S + V(base)?
   - Sai: "You like swimming?" → Đúng: "Do you like swimming?"
   - errorWord: "You", errorMessage: "Câu hỏi Yes/No cần 'Do/Does' ở đầu"

5. **PHỦ ĐỊNH (negation)**
   - Quy tắc: don't/doesn't + V(base) | didn't + V(base)
   - Sai: "He don't like swimming." → Đúng: "He doesn't like swimming."
   - errorWord: "don't", errorMessage: "He/She/It dùng 'doesn't', không dùng 'don't'"

6. **VIẾT HOA (capitalization)**
   - Quy tắc: "I" luôn viết hoa, đầu câu viết hoa
   - Sai: "i love swimming" → Đúng: "I love swimming."
   - errorWord: "i", errorMessage: "Chữ 'I' luôn viết hoa"

7. **MẠO TỪ (article)**
   - Quy tắc: Danh từ đếm được số ít cần a/an/the
   - Sai: "He is fast swimmer." → Đúng: "He is a fast swimmer."
   - errorWord: "swimmer", errorMessage: "Thiếu mạo từ 'a' trước 'fast swimmer'"

8. **DẤU CÂU (punctuation)**
   - Quy tắc: Câu kết thúc bằng . ? !
   - Sai: "I love swimming" → Đúng: "I love swimming."
   - errorWord: "(cuối câu)", errorMessage: "Thiếu dấu chấm kết thúc câu"

9. **TRẬT TỰ TỪ (word_order)**
   - Quy tắc: S + V + O/Adj/Adv
   - Sai: "Very I like swimming." → Đúng: "I like swimming very much."
   - errorWord: "Very I", errorMessage: "Sai trật tự từ"

10. **DẠNG DANH TỪ/ĐỘNG TỪ (word_type)**
    - Quy tắc: Phân biệt swimmer (N), swimming (Gerund), swim (V)
    - Sai: "He is a good swimming." → Đúng: "He is a good swimmer."
    - errorWord: "swimming", errorMessage: "Cần danh từ 'swimmer', không phải 'swimming'"

11. **THÌ VÀ HỢP TÁC TỪ (tense_agreement)**
    - Quy tắc: be + Adj/N; have + V3; can + V(base)
    - Sai: "He can swims." → Đúng: "He can swim."
    - errorWord: "swims", errorMessage: "Sau 'can' dùng động từ nguyên mẫu 'swim'"

12. **CHÍNH TẢ (spelling)**
    - Sai: "swiming" → Đúng: "swimming"
    - errorWord: "swiming", errorMessage: "Sai chính tả, đúng là 'swimming'"

---
### BƯỚC 3: Trả về JSON

Return ONLY valid JSON (không markdown, không giải thích ngoài JSON):
{
  "isCorrect": true/false,
  "hasTargetWord": true/false,
  "detectedVariant": "biến thể từ gốc tìm thấy trong câu (ví dụ: swimming, swimmer, swam)",
  "originalSentence": "Câu gốc người dùng nhập",
  "correctedSentence": "Câu đã sửa hoàn chỉnh với dấu câu đúng",
  "errors": [
    {
      "type": "verb_form_after_attitude|subject_verb_agreement|missing_subject|question_form|negation|capitalization|article|punctuation|word_order|word_type|tense_agreement|spelling",
      "errorWord": "từ/cụm từ sai cụ thể",
      "errorPosition": "vị trí cụ thể trong câu",
      "errorIndex": 0,
      "original": "phần sai",
      "corrected": "phần đã sửa",
      "errorMessage": "Mô tả lỗi ngắn gọn bằng tiếng Việt",
      "explanation": "Brief English explanation",
      "explanationVi": "Giải thích chi tiết tiếng Việt"
    }
  ],
  "vietnameseTranslation": "Bản dịch tiếng Việt của câu đúng",
  "grammarRule": "Main grammar rule in English",
  "grammarRuleVi": "Quy tắc ngữ pháp chính bằng tiếng Việt",
  "structure": {
    "pattern": "S + V + O",
    "explanation": "Subject + Verb + Object",
    "explanationVi": "Chủ ngữ + Động từ + Tân ngữ"
  },
  "encouragement": "Lời khuyến khích thân thiện"
}

---
### VÍ DỤ ĐẦU VÀO/ĐẦU RA

**Input**: "I love swim."
**Output**:
{
  "isCorrect": false,
  "hasTargetWord": true,
  "detectedVariant": "swim",
  "originalSentence": "I love swim.",
  "correctedSentence": "I love swimming.",
  "errors": [
    {
      "type": "verb_form_after_attitude",
      "errorWord": "swim",
      "errorPosition": "sau động từ 'love'",
      "errorIndex": 2,
      "original": "swim",
      "corrected": "swimming",
      "errorMessage": "Sau 'love' cần dùng 'swimming' hoặc 'to swim'",
      "explanation": "After 'love', use V-ing or 'to V'",
      "explanationVi": "Sau động từ chỉ sở thích (love/like/hate) cần dùng V-ing hoặc to V"
    }
  ],
  "vietnameseTranslation": "Tôi thích bơi.",
  "grammarRule": "love/like/hate + V-ing or to V",
  "grammarRuleVi": "Sau love/like/hate dùng V-ing hoặc to V",
  "structure": { "pattern": "S + love + V-ing", "explanation": "Subject + love + Gerund", "explanationVi": "Chủ ngữ + love + Danh động từ" },
  "encouragement": "Gần đúng rồi! Chỉ cần đổi 'swim' thành 'swimming'. Cố lên! 💪"
}

**Input**: "She swim fast."
**Output**:
{
  "isCorrect": false,
  "hasTargetWord": true,
  "detectedVariant": "swim",
  "originalSentence": "She swim fast.",
  "correctedSentence": "She swims fast.",
  "errors": [
    {
      "type": "subject_verb_agreement",
      "errorWord": "swim",
      "errorPosition": "động từ chính",
      "errorIndex": 1,
      "original": "swim",
      "corrected": "swims",
      "errorMessage": "Ngôi 3 số ít (She) cần động từ thêm -s",
      "explanation": "Third person singular requires verb + s",
      "explanationVi": "Chủ ngữ ngôi 3 số ít (he/she/it) cần động từ thêm -s/-es"
    }
  ],
  "vietnameseTranslation": "Cô ấy bơi nhanh.",
  "grammarRule": "He/She/It + Verb-s",
  "grammarRuleVi": "Ngôi 3 số ít + Động từ thêm -s",
  "structure": { "pattern": "S + V-s + Adv", "explanation": "Subject + Verb-s + Adverb", "explanationVi": "Chủ ngữ + Động từ-s + Trạng từ" },
  "encouragement": "Tốt lắm! Chỉ cần nhớ thêm '-s' cho động từ khi chủ ngữ là She/He/It. 👍"
}

**Input**: "He is a fast swimmer."
**Output**:
{
  "isCorrect": true,
  "hasTargetWord": true,
  "detectedVariant": "swimmer",
  "originalSentence": "He is a fast swimmer.",
  "correctedSentence": "He is a fast swimmer.",
  "errors": [],
  "vietnameseTranslation": "Anh ấy là một người bơi nhanh.",
  "grammarRule": "S + be + a/an + Adj + N",
  "grammarRuleVi": "Chủ ngữ + be + mạo từ + Tính từ + Danh từ",
  "structure": { "pattern": "S + be + a + Adj + N", "explanation": "Subject + be + Article + Adjective + Noun", "explanationVi": "Chủ ngữ + be + Mạo từ + Tính từ + Danh từ" },
  "encouragement": "Tuyệt vời! Câu hoàn toàn đúng ngữ pháp! 🎉"
}

**Input**: "I run every day."
**Output**:
{
  "isCorrect": false,
  "hasTargetWord": false,
  "detectedVariant": null,
  "originalSentence": "I run every day.",
  "correctedSentence": null,
  "errors": [],
  "vietnameseTranslation": null,
  "grammarRule": null,
  "grammarRuleVi": null,
  "structure": null,
  "encouragement": "❌ Câu thiếu từ gốc '{word}' hoặc biến thể của nó (swimming, swimmer, swims, swam, swum...)."
}

---
### QUY TẮC QUAN TRỌNG:
- Luôn thân thiện, khuyến khích, KHÔNG chê bai
- Nếu câu đúng hoàn toàn → isCorrect: true
- Nếu thiếu từ gốc → hasTargetWord: false, không kiểm tra ngữ pháp
- Chấp nhận TẤT CẢ biến thể hợp lệ của từ gốc
- Giải thích ngắn gọn, dễ hiểu`;

// Step 5: Generate sample sentences
const SAMPLE_SENTENCES_PROMPT = `Generate 4 sample sentences using the word "{word}" in different sentence types that the user hasn't used yet.

User's sentences: {userSentences}

Generate sentences in these types (skip types user already used):
- Affirmative (khẳng định)
- Negative (phủ định)  
- Question (câu hỏi)
- Past tense (quá khứ)
- Conditional (điều kiện)

Return ONLY valid JSON:
{
  "sampleSentences": [
    {
      "english": "The dog is not barking.",
      "vietnamese": "Con chó không sủa.",
      "type": "negative",
      "structure": {
        "pattern": "S + be + not + V-ing",
        "explanation": "Present continuous negative",
        "explanationVi": "Thì hiện tại tiếp diễn phủ định"
      }
    }
  ]
}`;

// Call OpenAI Vision API
async function callVisionAPI(imageBase64: string, prompt: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Vision API error: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function identifyImage(imageBase64: string, keys: any) {
  // Try OpenAI Vision first
  if (keys.openaiKey) {
    try {
      const content = await callVisionAPI(imageBase64, IDENTIFY_PROMPT, keys.openaiKey);
      const parsed = parseJsonFromAI(content);
      if (parsed?.mainObject) return parsed;
    } catch (err) {
      console.error("Vision API error:", err);
    }
  }

  // Fallback: Ask user to describe the image
  return {
    mainObject: null,
    needsDescription: true,
    message: "Không thể phân tích hình ảnh. Vui lòng mô tả đối tượng trong ảnh."
  };
}

// Identify from text description (fallback)
async function identifyFromDescription(description: string, keys: any) {
  // Clean and interpret the description
  const cleanDesc = description.trim().toLowerCase();
  
  const prompt = `You are a vocabulary learning assistant. The user describes what they see in an image: "${description}"

Your task: Identify the main English vocabulary word for this object/concept.

IMPORTANT: 
- If user says "picture", "image", "photo" - they might mean the word "picture" itself, or they're describing what's IN the picture
- If unclear, assume they want to learn the word they typed
- Always provide a valid response

Return ONLY valid JSON (no markdown, no explanation):
{
  "mainObject": {
    "english": "${cleanDesc === 'picture' || cleanDesc === 'image' || cleanDesc === 'photo' ? cleanDesc : 'the main object'}",
    "vietnamese": "nghĩa tiếng Việt",
    "partOfSpeech": "noun",
    "pronunciation": "/phonetic transcription/"
  },
  "relatedWords": [
    { "english": "related word 1", "vietnamese": "từ liên quan 1" },
    { "english": "related word 2", "vietnamese": "từ liên quan 2" }
  ]
}

Example for "dog": {"mainObject":{"english":"dog","vietnamese":"con chó","partOfSpeech":"noun","pronunciation":"/dɔːɡ/"},"relatedWords":[{"english":"puppy","vietnamese":"chó con"},{"english":"bark","vietnamese":"sủa"}]}
Example for "picture": {"mainObject":{"english":"picture","vietnamese":"bức tranh, hình ảnh","partOfSpeech":"noun","pronunciation":"/ˈpɪktʃər/"},"relatedWords":[{"english":"photo","vietnamese":"ảnh chụp"},{"english":"image","vietnamese":"hình ảnh"}]}`;

  const result = await callAI(prompt, keys, { temperature: 0.3, maxTokens: 600 });
  if (!result.success) throw new Error(result.error);
  
  const parsed = parseJsonFromAI(result.content);
  
  // If parsing failed, create a basic response from the description
  if (!parsed || !parsed.mainObject) {
    return {
      mainObject: {
        english: cleanDesc,
        vietnamese: `(${cleanDesc})`,
        partOfSpeech: "noun",
        pronunciation: ""
      },
      relatedWords: []
    };
  }
  
  return parsed;
}

async function checkSentence(sentence: string, targetWord: string, keys: any) {
  const prompt = CHECK_SENTENCE_PROMPT
    .replace("{word}", targetWord)
    .replace("{sentence}", sentence);

  const result = await callAI(prompt, keys, { temperature: 0.2, maxTokens: 500 });
  if (!result.success) throw new Error(result.error);
  return parseJsonFromAI(result.content);
}

async function generateSampleSentences(word: string, userSentences: string[], keys: any) {
  const prompt = SAMPLE_SENTENCES_PROMPT
    .replace("{word}", word)
    .replace("{userSentences}", userSentences.join("; "));

  const result = await callAI(prompt, keys, { temperature: 0.7, maxTokens: 800 });
  if (!result.success) throw new Error(result.error);
  return parseJsonFromAI(result.content);
}

// Save vocabulary to database
async function saveVocabulary(userId: string, word: string, meaning: string, partOfSpeech: string) {
  if (userId === "anonymous") return;
  try {
    await connectDB();
    const Vocabulary = (await import("@/app/models/Vocabulary")).default;
    await Vocabulary.findOneAndUpdate(
      { userId, word: word.toLowerCase() },
      {
        userId,
        word: word.toLowerCase(),
        meaning,
        type: partOfSpeech,
        source: "image_learning",
        easeFactor: 2.5,
        interval: 1,
        nextReviewDate: new Date(),
        isLearned: false
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("Save vocabulary error:", err);
  }
}

// Save structure to database
async function saveStructure(userId: string, pattern: string, meaning: string, example: string) {
  if (userId === "anonymous") return;
  try {
    await connectDB();
    const Vocabulary = (await import("@/app/models/Vocabulary")).default;
    await Vocabulary.findOneAndUpdate(
      { userId, word: pattern, type: "structure" },
      {
        userId,
        word: pattern,
        meaning,
        example,
        type: "structure",
        source: "image_learning",
        easeFactor: 2.5,
        interval: 1,
        nextReviewDate: new Date(),
        isLearned: false
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("Save structure error:", err);
  }
}

// Save error to database for later review
async function saveError(userId: string, original: string, corrected: string, errorType: string, explanation: string) {
  if (userId === "anonymous") return;
  try {
    await connectDB();
    const Vocabulary = (await import("@/app/models/Vocabulary")).default;
    await Vocabulary.findOneAndUpdate(
      { userId, word: original, type: "error" },
      {
        userId,
        word: original,
        meaning: corrected,
        example: explanation,
        exampleTranslation: errorType,
        type: "error",
        source: "image_learning",
        easeFactor: 2.5,
        interval: 1,
        nextReviewDate: new Date(),
        isLearned: false
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("Save error:", err);
  }
}

// POST handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId = "anonymous" } = body;
    
    const keys = await getUserApiKeys(userId);
    if (!keys.openaiKey && !keys.groqKey && !keys.cohereKey) {
      return NextResponse.json({ success: false, message: "Vui lòng cấu hình API key trong Settings" }, { status: 400 });
    }

    switch (action) {
      // Step 1: Identify object in image
      case "identify": {
        const { imageBase64 } = body;
        if (!imageBase64) {
          return NextResponse.json({ success: false, message: "Thiếu hình ảnh" }, { status: 400 });
        }
        const result = await identifyImage(imageBase64, keys);
        return NextResponse.json({ success: true, data: result });
      }

      // Step 1b: Identify from description (fallback)
      case "identifyFromDescription": {
        const { description } = body;
        if (!description) {
          return NextResponse.json({ success: false, message: "Thiếu mô tả" }, { status: 400 });
        }
        const result = await identifyFromDescription(description, keys);
        return NextResponse.json({ success: true, data: result });
      }

      // Step 2: Check user's vocabulary guess
      case "checkGuess": {
        const { guess, correctWord } = body;
        const isCorrect = guess.toLowerCase().trim() === correctWord.toLowerCase().trim();
        return NextResponse.json({ 
          success: true, 
          data: { 
            isCorrect, 
            correctWord,
            message: isCorrect 
              ? "🎉 Chính xác! Bây giờ hãy viết 4 câu với từ này." 
              : `❌ Chưa đúng. Từ đúng là "${correctWord}". Hãy viết 4 câu với từ này.`
          } 
        });
      }

      // Step 4: Check a single sentence
      case "checkSentence": {
        const { sentence, targetWord } = body;
        if (!sentence || !targetWord) {
          return NextResponse.json({ success: false, message: "Thiếu câu hoặc từ vựng" }, { status: 400 });
        }
        const result = await checkSentence(sentence, targetWord, keys);
        return NextResponse.json({ success: true, data: result });
      }

      // Step 5: Generate sample sentences
      case "generateSamples": {
        const { word, userSentences } = body;
        if (!word) {
          return NextResponse.json({ success: false, message: "Thiếu từ vựng" }, { status: 400 });
        }
        const result = await generateSampleSentences(word, userSentences || [], keys);
        return NextResponse.json({ success: true, data: result });
      }

      // Step 7: Save all learning data
      case "saveAll": {
        const { vocabulary, structures, errors } = body;
        
        // Save vocabulary
        if (vocabulary) {
          await saveVocabulary(userId, vocabulary.word, vocabulary.meaning, vocabulary.partOfSpeech);
        }
        
        // Save structures
        if (structures && Array.isArray(structures)) {
          for (const s of structures) {
            await saveStructure(userId, s.pattern, s.explanation, s.example);
          }
        }
        
        // Save errors
        if (errors && Array.isArray(errors)) {
          for (const e of errors) {
            await saveError(userId, e.original, e.corrected, e.type, e.explanation);
          }
        }
        
        return NextResponse.json({ 
          success: true, 
          message: "Đã lưu dữ liệu học tập",
          saved: {
            vocabulary: vocabulary ? 1 : 0,
            structures: structures?.length || 0,
            errors: errors?.length || 0
          }
        });
      }

      // Get saved data for user
      case "getSaved": {
        await connectDB();
        const Vocabulary = (await import("@/app/models/Vocabulary")).default;
        
        const vocabulary = await Vocabulary.find({ userId, type: { $nin: ["structure", "error"] }, source: "image_learning" })
          .sort({ createdAt: -1 }).limit(50);
        const structures = await Vocabulary.find({ userId, type: "structure", source: "image_learning" })
          .sort({ createdAt: -1 }).limit(50);
        const errors = await Vocabulary.find({ userId, type: "error", source: "image_learning" })
          .sort({ createdAt: -1 }).limit(50);
        
        return NextResponse.json({ 
          success: true, 
          data: { vocabulary, structures, errors }
        });
      }

      default:
        return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Image vocabulary learning error:", err);
    return NextResponse.json({ success: false, message: err.message || "Lỗi server" }, { status: 500 });
  }
}