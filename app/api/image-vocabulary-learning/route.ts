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

// Step 4: Check sentence - Detailed grammar analysis
const CHECK_SENTENCE_PROMPT = `You are an English grammar checker for Vietnamese learners.

TASK: Check this sentence that should contain the word "{word}" (or its variants like "{word}s"):

Sentence: "{sentence}"

CHECK FOR THESE COMMON ERRORS:
1. **Subject-Verb Agreement**: "Phone are" → "Phone is" (singular subject needs singular verb)
2. **Articles (a/an/the)**: "I like phone" → "I like the phone" or "I like phones" (countable nouns need articles)
3. **Singular/Plural**: Match subject with verb and use correct noun form
4. **Spelling**: Check all words for typos (e.g., "convinient" → "convenient")
5. **Punctuation**: Sentences must end with period (.), question mark (?), or exclamation (!)
6. **Word Order**: English follows S + V + O structure

FIRST: Check if sentence contains "{word}" or "{word}s". If NOT, set hasTargetWord: false.

Return ONLY valid JSON (no markdown):
{
  "isCorrect": true/false,
  "hasTargetWord": true/false,
  "correctedSentence": "fully corrected sentence with proper punctuation",
  "errors": [
    {
      "type": "subject_verb_agreement|article|singular_plural|spelling|punctuation|word_order",
      "original": "the exact wrong part",
      "corrected": "the correct version",
      "position": "where in sentence",
      "explanation": "Brief English explanation of the rule",
      "explanationVi": "Giải thích tiếng Việt về quy tắc ngữ pháp"
    }
  ],
  "vietnameseTranslation": "Bản dịch tiếng Việt của câu đúng",
  "grammarRule": "Main grammar rule applied (e.g., 'Singular nouns need articles')",
  "grammarRuleVi": "Quy tắc ngữ pháp chính (ví dụ: 'Danh từ số ít cần mạo từ')",
  "structure": {
    "pattern": "S + V + O",
    "explanation": "Subject + Verb + Object",
    "explanationVi": "Chủ ngữ + Động từ + Tân ngữ"
  }
}

EXAMPLES:
Input: "I have a phone" (missing period)
Output: {"isCorrect":false,"hasTargetWord":true,"correctedSentence":"I have a phone.","errors":[{"type":"punctuation","original":"phone","corrected":"phone.","position":"end","explanation":"Sentences must end with punctuation","explanationVi":"Câu phải kết thúc bằng dấu chấm"}],"vietnameseTranslation":"Tôi có một chiếc điện thoại.","grammarRule":"End sentences with period","grammarRuleVi":"Kết thúc câu bằng dấu chấm","structure":{"pattern":"S + V + O","explanation":"Subject + Verb + Object","explanationVi":"Chủ ngữ + Động từ + Tân ngữ"}}

Input: "Phone are interesting"
Output: {"isCorrect":false,"hasTargetWord":true,"correctedSentence":"The phone is interesting.","errors":[{"type":"article","original":"Phone","corrected":"The phone","position":"start","explanation":"Singular countable nouns need an article","explanationVi":"Danh từ đếm được số ít cần mạo từ"},{"type":"subject_verb_agreement","original":"are","corrected":"is","position":"verb","explanation":"Singular subject 'phone' needs singular verb 'is'","explanationVi":"Chủ ngữ số ít 'phone' cần động từ số ít 'is'"}],"vietnameseTranslation":"Chiếc điện thoại thật thú vị.","grammarRule":"Subject-verb agreement and articles","grammarRuleVi":"Hòa hợp chủ-vị và mạo từ","structure":{"pattern":"S + V + Adj","explanation":"Subject + Verb + Adjective","explanationVi":"Chủ ngữ + Động từ + Tính từ"}}`;

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