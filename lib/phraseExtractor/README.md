# Phrase Extractor Module

Trích xuất cụm từ đa từ (multi-word vocabulary) từ tài liệu PDF/DOCX cho việc học tiếng Anh.

## Tính năng

- **Trích xuất text** từ PDF và DOCX
- **Cụm giới từ** (prepositional phrases): "in terms of", "due to", "according to"...
- **Cụm động từ** (phrasal verbs): "carry out", "set up", "come up with"...
- **Cụm danh từ** (noun phrases): "risk management", "learning process"...
- **Collocations**: Các cụm từ có ý nghĩa thống kê (PMI-based)

## Cài đặt

Dependencies đã được cài trong project:

```bash
npm install mammoth pdf-parse-new
```

## Sử dụng

### API Endpoint

```bash
# Upload file và trích xuất cụm từ
curl -X POST http://localhost:3000/api/extract-phrases \
  -F "file=@document.pdf" \
  -F "minFreq=2" \
  -F "maxPhrases=100"

# Xem documentation
curl http://localhost:3000/api/extract-phrases
```

### Programmatic Usage

```typescript
import { extractPhrasesFromFile } from "@/lib/phraseExtractor";

const buffer = fs.readFileSync("document.pdf");
const result = await extractPhrasesFromFile(
  buffer,
  "document.pdf",
  "application/pdf",
  { minFreq: 2, maxPhrases: 100 }
);

if (result.success) {
  console.log(result.phrases);
  // [{ text: "in terms of", type: "prep_phrase", score: 5.2, frequency: 3, examples: [...] }]
}
```

### Individual Functions

```typescript
import {
  extractText,
  normalizeText,
  splitSentences,
  extractPhrases,
} from "@/lib/phraseExtractor";

// 1. Extract text from file
const { text, pageCount } = await extractText(buffer, "application/pdf");

// 2. Normalize text
const normalized = normalizeText(text);

// 3. Split into sentences
const sentences = splitSentences(normalized);

// 4. Extract phrases
const phrases = extractPhrases(sentences, { minFreq: 2 });
```

## API Response Format

```json
{
  "success": true,
  "meta": {
    "filename": "document.pdf",
    "fileType": "application/pdf",
    "bytes": 102400,
    "extractedChars": 50000,
    "sentencesCount": 250,
    "pageCount": 10
  },
  "phrases": [
    {
      "text": "in terms of",
      "normalized": "in terms of",
      "type": "prep_phrase",
      "score": 5.23,
      "frequency": 8,
      "examples": [
        "In terms of performance, this approach is superior.",
        "In terms of cost, it is more affordable."
      ]
    }
  ]
}
```

## Phrase Types

| Type | Description | Examples |
|------|-------------|----------|
| `prep_phrase` | Cụm giới từ đa từ | "in terms of", "due to", "according to" |
| `phrasal_verb` | Động từ + particle | "carry out", "set up", "come up with" |
| `noun_phrase` | Cụm danh từ | "risk management", "learning process" |
| `collocation` | Cụm từ thống kê | Các cụm có PMI score cao |

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `minFreq` | 2 | Tần suất tối thiểu để giữ cụm từ |
| `maxPhrases` | 200 | Số lượng cụm từ tối đa trả về |
| `maxExamplesPerPhrase` | 3 | Số câu ví dụ tối đa cho mỗi cụm |
| `minNgramSize` | 2 | Kích thước n-gram tối thiểu |
| `maxNgramSize` | 5 | Kích thước n-gram tối đa |

## Error Handling

```json
// 400 - Bad Request
{ "success": false, "error": "No file uploaded" }
{ "success": false, "error": "Invalid file type" }
{ "success": false, "error": "File too large" }

// 422 - Unprocessable Entity
{ "success": false, "error": "PDF extraction failed" }

// 500 - Internal Server Error
{ "success": false, "error": "Internal server error" }
```

## File Limits

- **Max size**: 5MB
- **Supported formats**: PDF, DOCX
- **Recommended**: Tài liệu dưới 200 trang cho hiệu suất tốt nhất

## Testing

```bash
# Chạy tất cả unit tests
npm test

# Chạy tests với coverage
npm run test:coverage

# Chạy tests trong watch mode
npm run test:watch
```

### Test Structure

```
__tests__/phraseExtractor/
├── normalize.test.ts    # Text normalization tests (20 tests)
├── sentences.test.ts    # Sentence splitting tests (6 tests)
├── extractor.test.ts    # Phrase extraction tests (7 tests)
├── lists.test.ts        # Word lists tests (6 tests)
└── integration.test.ts  # Integration & edge cases (7 tests)
```

Total: 46 tests covering all modules.

## Architecture

```
lib/phraseExtractor/
├── index.ts          # Main exports & pipeline
├── textExtract.ts    # PDF/DOCX text extraction
├── normalize.ts      # Text normalization utilities
├── sentences.ts      # Sentence boundary detection
├── phraseExtractor.ts # Core phrase extraction logic
├── lists.ts          # Curated word lists
└── README.md         # This file
```

## Scoring Algorithm

Điểm số được tính dựa trên:
1. **Type priority**: prep_phrase (4) > phrasal_verb (3) > noun_phrase (2) > collocation (1)
2. **Length bonus**: +0.3 per word
3. **Frequency bonus**: log2(frequency + 1)

```
score = typePriority + (wordCount * 0.3) + log2(frequency + 1)
```
