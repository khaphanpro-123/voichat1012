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

NHIỆM VỤ: Kiểm tra câu có chứa từ "{word}" (hoặc "{word}s"):

Câu người dùng nhập: "{sentence}"

---
### BƯỚC 1: Chuẩn hóa và kiểm tra từ khóa
- Chuẩn hóa: viết hoa chữ cái đầu câu, loại bỏ khoảng trắng thừa
- Kiểm tra câu có chứa "{word}" hoặc "{word}s" (không phân biệt hoa/thường)
- Nếu KHÔNG có → hasTargetWord: false

---
### BƯỚC 2: Phân tích lỗi ngữ pháp CHI TIẾT

Với MỖI lỗi phát hiện, phải chỉ rõ:
- **errorWord**: từ/cụm từ sai cụ thể (ví dụ: "i", "orange", "cuối câu")
- **errorPosition**: vị trí trong câu (đầu câu/giữa câu/cuối câu/sau động từ...)
- **errorMessage**: mô tả ngắn gọn lỗi bằng tiếng Việt
- **suggestion**: cách sửa cụ thể

DANH SÁCH LỖI CẦN KIỂM TRA:

1. **VIẾT HOA (capitalization)**
   - Ví dụ: "i love orange" → lỗi ở "i" (đầu câu)
   - errorWord: "i", errorPosition: "đầu câu", errorMessage: "Chữ 'I' luôn viết hoa"

2. **MẠO TỪ (article)**
   - Ví dụ: "I love orange" → lỗi ở "orange" (thiếu mạo từ)
   - errorWord: "orange", errorPosition: "sau động từ", errorMessage: "Thiếu mạo từ trước danh từ số ít"

3. **DẤU CÂU (punctuation)**
   - Ví dụ: "I love the orange" → lỗi ở cuối câu
   - errorWord: "(cuối câu)", errorPosition: "cuối câu", errorMessage: "Thiếu dấu chấm kết thúc câu"

4. **CHIA ĐỘNG TỪ (subject_verb_agreement)**
   - Ví dụ: "Orange are sweet" → lỗi ở "are"
   - errorWord: "are", errorPosition: "động từ", errorMessage: "Chủ ngữ số ít dùng 'is', không dùng 'are'"

5. **SỐ ÍT/SỐ NHIỀU (singular_plural)**
   - Ví dụ: "I have many orange" → lỗi ở "orange"
   - errorWord: "orange", errorPosition: "sau 'many'", errorMessage: "Sau 'many' cần danh từ số nhiều"

6. **LOẠI TỪ (word_type)**
   - Ví dụ: "Orange is beauty" → lỗi ở "beauty"
   - errorWord: "beauty", errorPosition: "sau 'is'", errorMessage: "Cần tính từ 'beautiful', không phải danh từ 'beauty'"

7. **CHÍNH TẢ (spelling)**
   - Ví dụ: "orang is sweet" → lỗi ở "orang"
   - errorWord: "orang", errorPosition: "chủ ngữ", errorMessage: "Sai chính tả, đúng là 'orange'"

8. **TRẬT TỰ TỪ (word_order)**
   - Ví dụ: "Very I like orange" → lỗi ở "Very I"
   - errorWord: "Very I", errorPosition: "đầu câu", errorMessage: "Sai trật tự từ, đúng: 'I like orange very much'"

9. **THIẾU ĐỘNG TỪ (missing_verb)**
   - Ví dụ: "Orange very sweet" → thiếu động từ
   - errorWord: "(thiếu)", errorPosition: "sau chủ ngữ", errorMessage: "Thiếu động từ 'is'"

10. **SO SÁNH (comparative)**
    - Ví dụ: "Orange very sweeter" → lỗi ở "very sweeter"
    - errorWord: "very sweeter", errorPosition: "sau chủ ngữ", errorMessage: "Dùng 'much sweeter', không dùng 'very sweeter'"

---
### BƯỚC 3: Trả về JSON

Return ONLY valid JSON (không markdown, không giải thích ngoài JSON):
{
  "isCorrect": true/false,
  "hasTargetWord": true/false,
  "originalSentence": "Câu gốc người dùng nhập",
  "correctedSentence": "Câu đã sửa hoàn chỉnh với dấu câu đúng",
  "errors": [
    {
      "type": "capitalization|article|punctuation|subject_verb_agreement|singular_plural|word_type|spelling|word_order|missing_verb|comparative",
      "errorWord": "từ/cụm từ sai cụ thể",
      "errorPosition": "vị trí cụ thể trong câu",
      "original": "phần sai",
      "corrected": "phần đã sửa",
      "errorMessage": "Mô tả lỗi ngắn gọn bằng tiếng Việt",
      "explanation": "Brief English explanation",
      "explanationVi": "Giải thích chi tiết tiếng Việt"
    }
  ],
  "vietnameseTranslation": "Bản dịch tiếng Việt của câu đúng",
  "grammarRule": "Main grammar rule in English",
  "grammarRuleVi": "Quy tắc ngữ pháp chính bằng tiếng Việt (1 dòng)",
  "structure": {
    "pattern": "S + V + O",
    "explanation": "Subject + Verb + Object",
    "explanationVi": "Chủ ngữ + Động từ + Tân ngữ"
  },
  "encouragement": "Lời khuyến khích thân thiện (ví dụ: 'Gần đúng rồi! Chỉ cần thêm dấu chấm cuối câu thôi! 👍')"
}

---
### VÍ DỤ PHẢN HỒI

Input: "i love orange"

Output:
{
  "isCorrect": false,
  "hasTargetWord": true,
  "originalSentence": "i love orange",
  "correctedSentence": "I love the orange.",
  "errors": [
    {
      "type": "capitalization",
      "errorWord": "i",
      "errorPosition": "đầu câu",
      "original": "i",
      "corrected": "I",
      "errorMessage": "Chữ 'I' luôn viết hoa",
      "explanation": "'I' is always capitalized in English",
      "explanationVi": "Đại từ 'I' (tôi) luôn viết hoa trong tiếng Anh"
    },
    {
      "type": "article",
      "errorWord": "orange",
      "errorPosition": "sau động từ 'love'",
      "original": "orange",
      "corrected": "the orange",
      "errorMessage": "Thiếu mạo từ trước danh từ số ít",
      "explanation": "Countable singular nouns need an article (a/an/the)",
      "explanationVi": "Danh từ đếm được số ít cần mạo từ 'a/an/the' hoặc dùng số nhiều 'oranges'"
    },
    {
      "type": "punctuation",
      "errorWord": "(cuối câu)",
      "errorPosition": "cuối câu",
      "original": "",
      "corrected": ".",
      "errorMessage": "Thiếu dấu chấm kết thúc câu",
      "explanation": "Sentences need ending punctuation",
      "explanationVi": "Câu tiếng Anh cần kết thúc bằng dấu chấm (.), dấu hỏi (?), hoặc dấu chấm than (!)"
    }
  ],
  "vietnameseTranslation": "Tôi yêu quả cam.",
  "grammarRule": "Subject + Verb + Article + Object",
  "grammarRuleVi": "Chủ ngữ viết hoa + Động từ + Mạo từ + Tân ngữ + Dấu chấm",
  "structure": {
    "pattern": "S + V + the + N",
    "explanation": "Subject + Verb + Article + Noun",
    "explanationVi": "Chủ ngữ + Động từ + Mạo từ + Danh từ"
  },
  "encouragement": "Gần đúng rồi! Bạn chỉ cần nhớ 3 điều: viết hoa 'I', thêm mạo từ 'the', và dấu chấm cuối câu. Cố lên! 💪"
}

---
### QUY TẮC QUAN TRỌNG:
- Luôn thân thiện, khuyến khích, KHÔNG chê bai
- Nếu câu đúng hoàn toàn → isCorrect: true, encouragement: "Tuyệt vời! Câu hoàn toàn đúng ngữ pháp! 🎉"
- Nếu chỉ có 1 lỗi nhỏ → khen trước, sửa sau: "Câu rất tốt! Chỉ cần thêm dấu chấm cuối câu thôi!"
- Luôn đưa ra ít nhất một cách sửa tự nhiên
- Giải thích ngắn gọn, dễ hiểu, không dùng thuật ngữ phức tạp`;

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