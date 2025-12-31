import { NextRequest, NextResponse } from "next/server";

// Mock Vietnamese basic word list (in production, load from file/database)
const basicVietnameseWords = new Set([
  "tôi", "bạn", "anh", "chị", "em", "là", "có", "không", "và", "của",
  "trong", "với", "để", "được", "này", "đó", "một", "hai", "ba",
  "ngày", "hôm", "nay", "mai", "khi", "nào", "gì", "ai", "đâu",
]);

interface VocabCandidate {
  word: string;
  frequency: number;
  type: "noun" | "verb" | "phrase" | "unknown";
  isNew: boolean;
}

// Simple POS tagging (mock - in production use spaCy/Stanza)
function simplePosTagger(word: string): "noun" | "verb" | "phrase" | "unknown" {
  // Very basic heuristics
  const nounIndicators = ["viên", "sự", "học", "nghệ", "thuật", "gia"];
  const verbIndicators = ["học", "làm", "đi", "ăn", "uống", "nói"];

  if (word.includes(" ")) return "phrase";
  
  for (const indicator of nounIndicators) {
    if (word.includes(indicator)) return "noun";
  }
  
  for (const indicator of verbIndicators) {
    if (word.includes(indicator)) return "verb";
  }
  
  return "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const { text, chunks } = await req.json();

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Text required" },
        { status: 400 }
      );
    }

    // Extract words and count frequency
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length >= 3 && /[\p{L}]/u.test(w))
      .map((w: string) => w.replace(/[.,;:!?]/g, ""));

    const wordFreq = new Map<string, number>();
    words.forEach((word: string) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Extract noun phrases (simple: 2-3 word combinations)
    const phrases: string[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      const twoWord = `${words[i]} ${words[i + 1]}`;
      if (words[i].length >= 3 && words[i + 1].length >= 3) {
        phrases.push(twoWord);
      }
      
      if (i < words.length - 2) {
        const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
        phrases.push(threeWord);
      }
    }

    const phraseFreq = new Map<string, number>();
    phrases.forEach((phrase) => {
      phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1);
    });

    // Filter for "new" words (not in basic list)
    const candidates: VocabCandidate[] = [];

    // Add single words
    wordFreq.forEach((freq, word) => {
      const isNew = !basicVietnameseWords.has(word);
      if (isNew && freq >= 1) {
        candidates.push({
          word,
          frequency: freq,
          type: simplePosTagger(word),
          isNew: true,
        });
      }
    });

    // Add phrases with frequency >= 2
    phraseFreq.forEach((freq, phrase) => {
      if (freq >= 2) {
        candidates.push({
          word: phrase,
          frequency: freq,
          type: "phrase",
          isNew: true,
        });
      }
    });

    // Sort by frequency
    candidates.sort((a, b) => b.frequency - a.frequency);

    // Take top 30 candidates
    const topCandidates = candidates.slice(0, 30);

    return NextResponse.json({
      success: true,
      candidates: topCandidates,
      stats: {
        totalWords: words.length,
        uniqueWords: wordFreq.size,
        newWords: candidates.filter((c) => c.type !== "phrase").length,
        phrases: candidates.filter((c) => c.type === "phrase").length,
      },
    });
  } catch (error) {
    console.error("Vocab extraction error:", error);
    return NextResponse.json(
      { success: false, message: "Vocabulary extraction failed" },
      { status: 500 }
    );
  }
}
