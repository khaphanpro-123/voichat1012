/**
 * Noise Detection for OCR
 * Phát hiện từ vô nghĩa từ OCR noise
 */

export interface NoiseWord {
  word: string
  confidence: number
  reason: string
}

export function detectNoiseWords(text: string): NoiseWord[] {
  const noiseWords: NoiseWord[] = []
  const words = text.split(/\s+/).filter(w => w.length > 0)

  for (const word of words) {
    const noise = analyzeWord(word)
    if (noise) {
      noiseWords.push(noise)
    }
  }

  return noiseWords
}

function analyzeWord(word: string): NoiseWord | null {
  // 1. Kiểm tra ký tự lạ (OCR artifacts)
  if (hasStrangeCharacters(word)) {
    return {
      word,
      confidence: 0.9,
      reason: "Chứa ký tự lạ (OCR noise)",
    }
  }

  // 2. Kiểm tra độ dài bất thường
  if (word.length > 30) {
    return {
      word,
      confidence: 0.7,
      reason: "Từ quá dài (có thể là noise)",
    }
  }

  // 3. Kiểm tra toàn số
  if (/^\d+$/.test(word)) {
    return null // Số không phải noise
  }

  // 4. Kiểm tra toàn ký tự đặc biệt
  if (/^[^a-zA-Z0-9àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+$/.test(word)) {
    return {
      word,
      confidence: 0.95,
      reason: "Toàn ký tự đặc biệt",
    }
  }

  // 5. Kiểm tra lặp ký tự
  if (/(.)\1{3,}/.test(word)) {
    return {
      word,
      confidence: 0.85,
      reason: "Ký tự lặp quá nhiều",
    }
  }

  // 6. Kiểm tra hỗn hợp lạ
  if (hasMixedScripts(word)) {
    return {
      word,
      confidence: 0.8,
      reason: "Hỗn hợp ký tự từ nhiều ngôn ngữ",
    }
  }

  // 7. Kiểm tra từ quá ngắn với ký tự lạ
  if (word.length <= 2 && /[^a-zA-Z0-9àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/.test(word)) {
    return {
      word,
      confidence: 0.75,
      reason: "Từ quá ngắn với ký tự lạ",
    }
  }

  return null
}

function hasStrangeCharacters(word: string): boolean {
  // Ký tự lạ từ OCR: ™, ©, ®, §, ¶, etc.
  const strangeChars = /[™©®§¶†‡•‰′″‴‵‶‷‸‹›«»„‟""''‚''`~^¨˚˜¯ˆ˝]/
  return strangeChars.test(word)
}

function hasMixedScripts(word: string): boolean {
  const hasLatin = /[a-zA-Z]/.test(word)
  const hasVietnamese = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(word)
  const hasNumbers = /\d/.test(word)
  const hasSpecial = /[^a-zA-Z0-9àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/.test(word)

  const scriptCount = [hasLatin, hasVietnamese, hasNumbers, hasSpecial].filter(Boolean).length
  return scriptCount > 2
}

export function filterNoiseFromVocabulary(
  vocabulary: any[],
  noiseWords: NoiseWord[]
): {
  clean: any[]
  noise: any[]
} {
  const noiseSet = new Set(noiseWords.map(n => n.word.toLowerCase()))

  const clean = vocabulary.filter(
    item => !noiseSet.has((item.word || item.phrase || "").toLowerCase())
  )

  const noise = vocabulary.filter(
    item => noiseSet.has((item.word || item.phrase || "").toLowerCase())
  )

  return { clean, noise }
}
