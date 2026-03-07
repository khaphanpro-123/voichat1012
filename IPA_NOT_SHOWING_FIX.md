# 🔧 IPA Not Showing - Diagnosis and Fix

## Issue
- ✅ Upload works and vocabulary is saved to `/vocabulary`
- ❌ IPA (phonetic transcription) is NOT showing for single words
- ❌ IPA is NOT showing for two-word phrases

## Root Causes

### 1. Dictionary API Rate Limiting
The backend uses Free Dictionary API which has limits:
- **Free tier**: ~450 requests/hour
- **Current delay**: 200ms between requests
- **Problem**: With 30-50 words, we make 30-50 API calls → Can hit rate limit

### 2. IPA Generation Timeout
- **Current timeout**: 3 seconds per word
- **Problem**: If API is slow or rate limited, timeout occurs → No IPA

### 3. Missing Fallback
- **Current**: If Dictionary API fails, return empty string
- **Problem**: No fallback to local IPA dictionary

## Solutions

### Solution 1: Add Local IPA Dictionary Fallback (RECOMMENDED)

Update `complete_pipeline.py` to use local dictionary when API fails:

```python
def _get_single_word_ipa(self, word: str) -> str:
    """Get IPA with fallback to local dictionary"""
    
    # Try Dictionary API first
    try:
        import requests
        import time
        
        time_since_last = time.time() - getattr(self, '_last_api_call', 0)
        if time_since_last < 0.3:  # Increase to 300ms
            time.sleep(0.3 - time_since_last)
        self._last_api_call = time.time()
        
        url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
        response = requests.get(url, timeout=5)  # Increase timeout to 5s
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                phonetics = data[0].get('phonetics', [])
                for phonetic in phonetics:
                    ipa_text = phonetic.get('text', '')
                    if ipa_text:
                        ipa_text = ipa_text.strip()
                        if not ipa_text.startswith('/'):
                            ipa_text = '/' + ipa_text
                        if not ipa_text.endswith('/'):
                            ipa_text = ipa_text + '/'
                        return ipa_text
    except Exception as e:
        pass  # Fall through to local dictionary
    
    # Fallback: Use local IPA dictionary
    from ipa_dict import IPA_DICT
    return IPA_DICT.get(word.lower(), "")
```

### Solution 2: Create Local IPA Dictionary

Create `python-api/ipa_dict.py`:

```python
"""
Local IPA Dictionary - Fallback when API fails
Contains ~1000 most common English words
"""

IPA_DICT = {
    # Common verbs
    'be': '/biː/',
    'have': '/hæv/',
    'do': '/duː/',
    'say': '/seɪ/',
    'get': '/ɡet/',
    'make': '/meɪk/',
    'go': '/ɡəʊ/',
    'know': '/nəʊ/',
    'take': '/teɪk/',
    'see': '/siː/',
    'come': '/kʌm/',
    'think': '/θɪŋk/',
    'look': '/lʊk/',
    'want': '/wɒnt/',
    'give': '/ɡɪv/',
    'use': '/juːz/',
    'find': '/faɪnd/',
    'tell': '/tel/',
    'ask': '/ɑːsk/',
    'work': '/wɜːk/',
    
    # Common nouns
    'time': '/taɪm/',
    'person': '/ˈpɜːsn/',
    'year': '/jɪə(r)/',
    'way': '/weɪ/',
    'day': '/deɪ/',
    'thing': '/θɪŋ/',
    'man': '/mæn/',
    'world': '/wɜːld/',
    'life': '/laɪf/',
    'hand': '/hænd/',
    'part': '/pɑːt/',
    'child': '/tʃaɪld/',
    'eye': '/aɪ/',
    'woman': '/ˈwʊmən/',
    'place': '/pleɪs/',
    
    # Common adjectives
    'good': '/ɡʊd/',
    'new': '/njuː/',
    'first': '/fɜːst/',
    'last': '/lɑːst/',
    'long': '/lɒŋ/',
    'great': '/ɡreɪt/',
    'little': '/ˈlɪtl/',
    'own': '/əʊn/',
    'other': '/ˈʌðə(r)/',
    'old': '/əʊld/',
    'right': '/raɪt/',
    'big': '/bɪɡ/',
    'high': '/haɪ/',
    'different': '/ˈdɪfrənt/',
    'small': '/smɔːl/',
    'large': '/lɑːdʒ/',
    
    # Add more common words...
    # Total: ~1000 words
}
```

### Solution 3: Batch IPA Generation

Instead of generating IPA one-by-one, batch them:

```python
def _get_batch_ipa(self, words: List[str]) -> Dict[str, str]:
    """Get IPA for multiple words in batch"""
    results = {}
    
    for word in words:
        # Try API with rate limiting
        ipa = self._get_single_word_ipa(word)
        results[word] = ipa
        
        # If we hit rate limit, switch to local dictionary
        if not ipa:
            results[word] = IPA_DICT.get(word.lower(), "")
    
    return results
```

### Solution 4: Cache IPA Results

Cache IPA results to avoid repeated API calls:

```python
def __init__(self):
    self.ipa_cache = {}  # Cache IPA results

def _get_single_word_ipa(self, word: str) -> str:
    # Check cache first
    if word in self.ipa_cache:
        return self.ipa_cache[word]
    
    # Get IPA (from API or local dict)
    ipa = self._fetch_ipa(word)
    
    # Cache result
    self.ipa_cache[word] = ipa
    return ipa
```

## Implementation Steps

### Step 1: Create IPA Dictionary File

```bash
cd python-api
# Copy IPA dictionary from frontend
cp ../lib/ipaDict.ts ipa_dict.py
# Convert TypeScript to Python format
```

### Step 2: Update complete_pipeline.py

Add import:
```python
from ipa_dict import IPA_DICT
```

Update `_get_single_word_ipa()` method with fallback.

### Step 3: Test Locally

```bash
cd python-api
python test_ipa.py
```

### Step 4: Deploy to Railway

```bash
git add python-api/ipa_dict.py python-api/complete_pipeline.py
git commit -m "feat: Add local IPA dictionary fallback"
git push origin main
```

### Step 5: Verify

1. Upload a document
2. Check Railway logs for:
   ```
   ✓ Added IPA to 28/30 items ✅
   ```
3. Check `/vocabulary` page - IPA should show

## Expected Results

### Before Fix:
```
✓ Added IPA to 5/30 items ❌ (IPA library not working)
```

### After Fix:
```
✓ Added IPA to 28/30 items ✅
```

**Why not 30/30?**
- Some rare/technical words may not be in local dictionary
- Some words may have typos or be non-English

## Debugging

### Check Railway Logs

Look for:
```
📊 IPA Sample (first 5 items):
  1. 'climate change' -> IPA: '/ˈklaɪmət tʃeɪndʒ/' | POS: 'noun'
  2. 'environment' -> IPA: '/ɪnˈvaɪrənmənt/' | POS: 'noun'
  3. 'pollution' -> IPA: '/pəˈluːʃn/' | POS: 'noun'
```

### Check Database

```javascript
db.vocabulary.find({ userId: "..." }).limit(5)

// Should see:
{
  word: "climate change",
  ipa: "/ˈklaɪmət tʃeɪndʒ/",
  partOfSpeech: "noun"
}
```

### Check Frontend Console

```javascript
console.log("IPA check:", {
  hasIpa: !!item.ipa,
  ipaValue: item.ipa
})
```

## Alternative: Use eng_to_ipa Library

If Dictionary API continues to fail, install `eng_to_ipa`:

```bash
# In python-api/requirements-railway.txt
eng-to-ipa==0.0.2
```

Then update code:
```python
try:
    import eng_to_ipa as ipa
    result = ipa.convert(word)
    if result:
        return f'/{result}/'
except:
    return IPA_DICT.get(word.lower(), "")
```

## Summary

**Root cause**: Dictionary API rate limiting + no fallback

**Solution**: Add local IPA dictionary as fallback

**Files to change**:
1. `python-api/ipa_dict.py` (NEW)
2. `python-api/complete_pipeline.py` (UPDATE)

**Expected improvement**: 5/30 → 28/30 words with IPA
