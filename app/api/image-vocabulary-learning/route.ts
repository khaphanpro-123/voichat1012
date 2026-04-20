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
const CHECK_SENTENCE_PROMPT = `You are a friendly English grammar checker for Vietnamese learners.

TASK: Check if the sentence contains the word "{word}" (or its variants like {word}s, {word}ing, {word}er, {word}ed) and analyze grammar errors.

Sentence: "{sentence}"
Target word: "{word}"

RULES:
1. First check if sentence contains "{word}" or any variant (swimming, swimmer, swims, swam, swum for "swim")
2. If no target word found: hasTargetWord = false, skip grammar check
3. If found: check for these common errors:
   - Subject-verb agreement (She swim → She swims)
   - Verb form after like/love/hate (I love swim → I love swimming)
   - Missing article (He is swimmer → He is a swimmer)
   - Capitalization (i love → I love)
   - Punctuation (missing period at end)
   - Spelling errors

Return ONLY valid JSON (no markdown, no explanation):
{
  "isCorrect": true or false,
  "hasTargetWord": true or false,
  "detectedVariant": "the variant found (e.g. swimming)",
  "originalSentence": "original sentence",
  "correctedSentence": "corrected sentence with proper punctuation",
  "errors": [
    {
      "type": "subject_verb_agreement",
      "errorWord": "swim",
      "errorPosition": "after subject",
      "errorIndex": 1,
      "original": "swim",
      "corrected": "swims",
      "errorMessage": "Ngôi 3 số ít (She) cần động từ thêm -s",
      "explanation": "Third person singular needs verb+s",
      "explanationVi": "Chủ ngữ ngôi 3 số ít cần động từ thêm -s"
    }
  ],
  "vietnameseTranslation": "Vietnamese translation of correct sentence",
  "encouragement": "Friendly encouragement in Vietnamese"
}

ERROR TYPES: subject_verb_agreement, verb_form_after_attitude, article, capitalization, punctuation, spelling, word_order, negation, question_form

EXAMPLES:
Input: "I love swim." → errors: [{type:"verb_form_after_attitude", errorWord:"swim", corrected:"swimming", errorMessage:"Sau 'love' cần V-ing"}]
Input: "She swim fast." → errors: [{type:"subject_verb_agreement", errorWord:"swim", corrected:"swims", errorMessage:"Ngôi 3 số ít cần thêm -s"}]
Input: "He is a fast swimmer." → isCorrect: true, errors: []`;

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
    .replace(/{word}/g, targetWord)
    .replace("{sentence}", sentence);

  console.log(`[checkSentence] Checking: "${sentence}" with target word: "${targetWord}"`);
  
  const result = await callAI(prompt, keys, { temperature: 0.2, maxTokens: 1200 });
  
  if (!result.success) {
    console.error("[checkSentence] AI call failed:", result.error);
    throw new Error(result.error);
  }
  
  console.log("[checkSentence] AI response:", result.content.substring(0, 500));
  
  const parsed = parseJsonFromAI(result.content);
  
  if (!parsed) {
    console.error("[checkSentence] Failed to parse JSON from AI response");
    // Return a default error response if parsing fails
    return {
      isCorrect: false,
      hasTargetWord: true,
      originalSentence: sentence,
      correctedSentence: sentence,
      errors: [{
        type: "parse_error",
        errorWord: "",
        errorPosition: "",
        errorIndex: 0,
        original: sentence,
        corrected: sentence,
        errorMessage: "Không thể phân tích câu. Vui lòng thử lại.",
        explanation: "Could not parse AI response",
        explanationVi: "Hệ thống gặp lỗi khi phân tích. Vui lòng thử lại."
      }],
      vietnameseTranslation: "",
      encouragement: "Hãy thử lại nhé! "
    };
  }
  
  console.log("[checkSentence] Parsed result:", JSON.stringify(parsed).substring(0, 500));
  return parsed;
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
    
    // Check if user has any API key
    const hasAnyKey = !!(keys.openaiKey || keys.groqKey || keys.cohereKey);
    
    if (!hasAnyKey) {
      return NextResponse.json({ 
        success: false, 
        error: "MISSING_KEY",
        message: "Vui lòng cấu hình API key trong Settings để sử dụng tính năng này",
        requireApiKey: true
      }, { status: 401 });
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
              ? " Chính xác! Bây giờ hãy viết 4 câu với từ này." 
              : ` Chưa đúng. Từ đúng là "${correctWord}". Hãy viết 4 câu với từ này.`
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
        
        // Auto-save errors to GrammarError model if sentence has errors
        // Skip punctuation errors (not important for user)
        if (result && result.isCorrect === false && result.errors && result.errors.length > 0 && userId !== "anonymous") {
          try {
            await connectDB();
            const GrammarError = (await import("@/app/models/GrammarError")).default;
            
            // Filter out punctuation errors
            const errorsToSave = result.errors.filter((e: any) => e.type !== "punctuation");
            
            for (const error of errorsToSave) {
              // Check if this error already exists (avoid duplicates)
              const existing = await GrammarError.findOne({
                userId,
                sentence: sentence.toLowerCase().trim(),
                errorType: error.type
              });
              
              if (!existing) {
                await GrammarError.create({
                  userId,
                  sentence,
                  correctedSentence: result.correctedSentence || "",
                  errorType: error.type || "grammar",
                  errorWord: error.errorWord || error.original || "",
                  errorMessage: error.errorMessage || error.explanation || "",
                  explanation: error.explanationVi || error.explanation || "",
                  targetWord,
                  source: "image_learning"
                });
              }
            }
            console.log(`[checkSentence] Auto-saved ${errorsToSave.length} errors for user ${userId} (skipped punctuation)`);
          } catch (saveErr) {
            console.error("[checkSentence] Error auto-saving grammar errors:", saveErr);
            // Don't fail the request if saving errors fails
          }
        }
        
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
    
    // Check for specific error types
    const errorMessage = err.message || "";
    
    // Detect expired/invalid key errors
    if (errorMessage.includes("401") || errorMessage.includes("403") || 
        errorMessage.includes("INVALID_KEY") || errorMessage.includes("expired") ||
        errorMessage.includes("invalid_api_key")) {
      return NextResponse.json({ 
        success: false, 
        error: "EXPIRED_KEY",
        message: "API key đã hết hạn hoặc không hợp lệ. Vui lòng cập nhật key mới trong Settings.",
        requireApiKey: true
      }, { status: 401 });
    }
    
    // Detect quota exceeded
    if (errorMessage.includes("429") || errorMessage.includes("QUOTA_EXCEEDED") ||
        errorMessage.includes("rate_limit") || errorMessage.includes("quota")) {
      return NextResponse.json({ 
        success: false, 
        error: "QUOTA_EXCEEDED",
        message: "API key đã hết quota. Vui lòng thử lại sau hoặc sử dụng key khác.",
        requireApiKey: true
      }, { status: 429 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: "SERVER_ERROR",
      message: err.message || "Lỗi server" 
    }, { status: 500 });
  }
}