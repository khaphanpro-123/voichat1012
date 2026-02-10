# STAGE 12: Flashcard Generation - Yêu Cầu

## Yêu Cầu Từ User

### 1. ✅ Đồng nghĩa gộp chung 1 thẻ
**Ví dụ**:
- "climate change" (similarity: 0.89)
- "climatic change"
- "climate shift"

→ **1 flashcard** với:
- **Front**: climate change
- **Synonyms**: climatic change, climate shift
- **Back**: Definition...

### 2. ✅ Các bước trước KHÔNG xóa từ đồng nghĩa
**Status**: ĐÃ FIX
- STAGE 8: Disabled overlap removal
- STAGE 10: Synonym collapse bị skip

→ Tất cả từ đồng nghĩa được giữ lại

### 3. ✅ Từ gần nghĩa cùng cluster
**Status**: ĐÃ CÓ trong STAGE 11
- Knowledge Graph tạo relations "similar_to" (similarity > 0.7)
- Mỗi từ có `cluster_id` và `cluster_rank`

### 4. ❌ IPA Phonetic
**Cần thêm**: Phiên âm IPA cho mỗi từ

**Ví dụ**:
```json
{
  "word": "climate change",
  "ipa": "/ˈklaɪmət tʃeɪndʒ/",
  "ipa_uk": "/ˈklaɪmət tʃeɪndʒ/",
  "ipa_us": "/ˈklaɪmət tʃeɪndʒ/"
}
```

**Giải pháp**:
- Option 1: Use `eng_to_ipa` library (Python)
- Option 2: Use CMU Pronouncing Dictionary
- Option 3: Call external API (Google Dictionary, Oxford)

### 5. ❌ Audio phát âm từ
**Cần thêm**: File audio hoặc URL để phát âm từ

**Ví dụ**:
```json
{
  "word": "climate change",
  "audio_url": "https://tts.google.com/climate-change.mp3",
  "audio_uk": "https://...",
  "audio_us": "https://..."
}
```

**Giải pháp**:
- Option 1: Google Text-to-Speech API
- Option 2: Amazon Polly
- Option 3: Microsoft Azure TTS
- Option 4: Generate locally with `gTTS` (Python)

### 6. ❌ Audio phát âm câu
**Cần thêm**: File audio để phát âm câu ví dụ

**Ví dụ**:
```json
{
  "word": "climate change",
  "example": "Climate change is one of the most pressing issues.",
  "example_audio_url": "https://tts.google.com/example-1.mp3"
}
```

## Flashcard Format Mới

### Current (Hiện tại)
```json
{
  "word": "climate change",
  "meaning": "Academic term from document.pdf",
  "example": "Climate change is one of...",
  "score": 0.95
}
```

### Proposed (Đề xuất)
```json
{
  "id": "fc_1",
  "word": "climate change",
  "synonyms": ["climatic change", "climate shift"],
  "cluster_id": 0,
  "cluster_name": "Climate Science",
  "semantic_role": "core",
  "importance_score": 0.95,
  
  // Definition
  "meaning": "Long-term shifts in global or regional climate patterns...",
  "definition_source": "generated",
  
  // Example
  "example": "Climate change is one of the most pressing issues facing humanity today.",
  "example_source": "document",
  
  // Phonetics
  "ipa": "/ˈklaɪmət tʃeɪndʒ/",
  "ipa_uk": "/ˈklaɪmət tʃeɪndʒ/",
  "ipa_us": "/ˈklaɪmət tʃeɪndʒ/",
  
  // Audio
  "audio_word_url": "https://tts.google.com/climate-change.mp3",
  "audio_example_url": "https://tts.google.com/example-1.mp3",
  
  // Metadata
  "word_type": "noun phrase",
  "difficulty": "intermediate",
  "tags": ["environment", "science", "climate"],
  
  // Related words (from same cluster)
  "related_words": [
    {"word": "global warming", "similarity": 0.85},
    {"word": "greenhouse effect", "similarity": 0.78}
  ]
}
```

## Implementation Plan

### Phase 1: Synonym Grouping (Priority: HIGH)
```python
def _group_synonyms(vocabulary):
    """
    Group synonyms into flashcard groups
    
    Input: 259 vocabulary items
    Output: ~200 flashcard groups (some with multiple synonyms)
    """
    # Use similarity matrix from STAGE 11
    # Group items with similarity > 0.85
    # Select primary term (highest score)
    # Add others as synonyms
```

### Phase 2: IPA Phonetics (Priority: MEDIUM)
```python
def _add_ipa_phonetics(flashcards):
    """
    Add IPA phonetic transcription
    
    Options:
    1. eng_to_ipa library (offline, fast)
    2. CMU Dict (offline, limited)
    3. External API (online, accurate)
    """
    import eng_to_ipa as ipa
    
    for card in flashcards:
        card['ipa'] = ipa.convert(card['word'])
```

### Phase 3: Audio Generation (Priority: LOW)
```python
def _generate_audio(flashcards):
    """
    Generate audio files for words and examples
    
    Options:
    1. gTTS (free, offline)
    2. Google Cloud TTS (paid, high quality)
    3. Pre-generated URLs (no generation)
    """
    from gtts import gTTS
    
    for card in flashcards:
        # Generate word audio
        tts = gTTS(card['word'], lang='en')
        tts.save(f"audio/{card['id']}_word.mp3")
        
        # Generate example audio
        tts = gTTS(card['example'], lang='en')
        tts.save(f"audio/{card['id']}_example.mp3")
```

## Quick Wins (Có thể làm ngay)

### 1. Synonym Grouping
- Use similarity matrix from STAGE 11
- Group items with similarity > 0.85
- **Time**: 30 minutes

### 2. Cluster Information
- Already have `cluster_id` and `cluster_rank`
- Add `cluster_name` based on top terms
- **Time**: 15 minutes

### 3. Related Words
- Use "similar_to" relations from STAGE 11
- Add top 3-5 related words per flashcard
- **Time**: 20 minutes

### 4. IPA Phonetics (Basic)
- Install `eng-to-ipa` library
- Add basic IPA transcription
- **Time**: 30 minutes

## Dependencies

### For IPA:
```bash
pip install eng-to-ipa
```

### For Audio (gTTS):
```bash
pip install gtts
```

### For Audio (Google Cloud TTS):
```bash
pip install google-cloud-texttospeech
# Requires API key
```

## Bạn Muốn Tôi Làm Gì Trước?

1. **Synonym Grouping** - Gộp đồng nghĩa vào 1 thẻ
2. **IPA Phonetics** - Thêm phiên âm IPA
3. **Audio Generation** - Tạo file audio
4. **All of the above** - Làm tất cả

Hoặc bạn muốn tôi làm theo thứ tự ưu tiên nào?
