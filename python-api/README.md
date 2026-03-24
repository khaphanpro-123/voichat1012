# 🐍 Visual Language Tutor - Python API

Complete 11-Step Vocabulary Extraction Pipeline with Learned Scoring

**Version**: 2.0 (New Pipeline)  
**Last Updated**: 2026-03-24

---

## 📋 Overview

This Python FastAPI backend provides advanced vocabulary extraction from English documents using an 11-step pipeline with learned scoring:

1. **Document Ingestion & OCR**
2. **Heading Analysis**
3. **Structural Heading Context**
4. **Phrase Extraction**
5. **Single-Word Extraction**
6. **Independent Scoring**
7. **Merge Phrase & Word**
8. **Learned Final Scoring**
9. **Topic Modeling**
10. **Within-topic Ranking**
11. **Flashcard Generation**

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- pip
- Virtual environment (recommended)

### Installation

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download NLP models
python -m spacy download en_core_web_sm
python download_nltk_data.py

# Run server
python main.py
```

Server runs at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

---

## 📡 API Endpoints

### Main Endpoints

#### 1. Upload Document (Complete Pipeline)

```bash
POST /api/upload-document-complete
```

**Recommended endpoint** - Extracts phrases + single words

**Parameters**:
- `file`: Document file (.txt, .pdf, .docx) - **ENGLISH ONLY**
- `max_phrases`: Maximum phrases (default: 40, range: 10-100)
- `max_words`: Maximum single words (default: 10, range: 5-30)
- `use_bm25`: Enable BM25 filter (default: False)
- `bm25_weight`: BM25 weight (default: 0.2, max: 0.2)
- `generate_flashcards`: Generate flashcards (default: True)

**Example**:
```bash
curl -X POST http://localhost:8000/api/upload-document-complete \
  -F "file=@document.pdf" \
  -F "max_phrases=40" \
  -F "max_words=10"
```

**Response**:
```json
{
  "success": true,
  "document_id": "doc_20260210_123456",
  "vocabulary": [...],
  "vocabulary_count": 50,
  "flashcards": [...],
  "flashcards_count": 93,
  "knowledge_graph_stats": {...},
  "stages": {...}
}
```

---

#### 2. Get Knowledge Graph (STAGE 11)

```bash
GET /api/knowledge-graph/{document_id}
```

Returns knowledge graph data for visualization.

**Example**:
```bash
curl http://localhost:8000/api/knowledge-graph/doc_20260210_123456
```

**Response**:
```json
{
  "document_id": "doc_20260210_123456",
  "document_title": "Climate Change Report",
  "nodes": [
    {
      "id": "cluster_0",
      "type": "cluster",
      "label": "Climate Change & Global Warming",
      "size": 45,
      "color": "#FF6B6B"
    },
    {
      "id": "phrase_climate_change",
      "type": "phrase",
      "label": "climate change",
      "cluster_id": 0,
      "semantic_role": "core",
      "importance_score": 0.95
    }
  ],
  "edges": [...],
  "clusters": [...],
  "mindmap": "# Vocabulary Mind Map\n...",
  "stats": {
    "entities": 96,
    "relations": 300,
    "semantic_relations": 207,
    "clusters": 3
  }
}
```

---

#### 3. Get Flashcards (STAGE 12)

```bash
GET /api/flashcards/{document_id}?group_by_cluster=true
```

Returns flashcards grouped by cluster.

**Parameters**:
- `group_by_cluster`: Group by cluster (default: true)

**Example**:
```bash
curl http://localhost:8000/api/flashcards/doc_20260210_123456
```

**Response**:
```json
{
  "document_id": "doc_20260210_123456",
  "grouped_by_cluster": true,
  "clusters": [
    {
      "cluster_id": 0,
      "cluster_name": "Climate Change & Global Warming",
      "flashcard_count": 15,
      "flashcards": [
        {
          "id": "fc_0_1",
          "word": "climate change",
          "synonyms": [
            {"word": "climatic change", "similarity": 0.89}
          ],
          "meaning": "Long-term shifts in climate patterns",
          "example": "Climate change is affecting...",
          "ipa": "/ˈklaɪmət tʃeɪndʒ/",
          "audio_word_url": "https://...",
          "audio_example_url": "https://...",
          "difficulty": "advanced",
          "related_words": [...]
        }
      ]
    }
  ],
  "total_flashcards": 93,
  "total_clusters": 3
}
```

---

### Health Check

```bash
GET /health
GET /
```

Check if server is running.

---

## 🏗️ Architecture

### Pipeline Stages

```
STAGE 1: Document Ingestion & Normalization
  ↓
STAGE 2: Heading Detection
  ↓
STAGE 3: Context Intelligence (Structural Heading Context)
  - Build sentences
  - Create context map
  ↓
STAGE 4: Phrase Extraction (with Learning-to-Rank)
  - Extract phrases
  - Compute scores
  - Cluster phrases
  ↓
STAGE 5: Single-Word Extraction (with Learning-to-Rank)
  - Extract single words
  - Compute scores
  ↓
STAGE 6: Independent Scoring
  - Semantic score (cosine similarity)
  - Learning value (academic potential)
  - Frequency score (log-scaled)
  - Rarity score (IDF-based)
  ↓
STAGE 7: Merge Phrase & Word
  - Simple union
  ↓
STAGE 8: Learned Final Scoring
  - Regression model prediction
  - Fallback: weighted average
  ↓
STAGE 9: Topic Modeling
  - KMeans clustering
  - Topic name generation
  ↓
STAGE 10: Within-topic Ranking
  - Centrality computation
  - Semantic role assignment (core/supporting/peripheral)
  - Synonym grouping (similarity > 0.75)
  ↓
STAGE 11: Flashcard Generation
  - Core terms
  - Supporting terms
  - Related terms
```

---

## 📁 Project Structure

```
python-api/
├── main.py                          # FastAPI app + endpoints
├── complete_pipeline.py             # Stages 1-5 (Document Processing)
├── new_pipeline_learned_scoring.py  # Stages 6-11 (Learned Scoring)
├── phrase_centric_extractor.py      # STAGE 4: Phrase extraction
├── single_word_extractor_v2.py      # STAGE 5: Single word extraction
├── phrase_scorer.py                 # Scoring + clustering for phrases
├── context_intelligence.py          # STAGE 3: Context analysis
├── heading_detector.py              # STAGE 2: Heading detection
├── embedding_utils.py               # Embedding utilities
├── requirements.txt                 # Python dependencies
├── Procfile                         # Railway/Render config
├── runtime.txt                      # Python version
├── railway.json                     # Railway deployment config
├── .gitignore                       # Git ignore rules
└── README.md                        # This file
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Optional: OpenAI API Key
OPENAI_API_KEY=sk-...

# Optional: Google Gemini API Key
GOOGLE_GEMINI_API_KEY=AIza...

# Port (auto-set by Railway/Render)
PORT=8000
```

### Pipeline Parameters

Adjust in upload request:

- `max_phrases`: 10-100 (default: 40)
- `max_words`: 5-30 (default: 10)
- `use_bm25`: true/false (default: false)
- `bm25_weight`: 0.0-0.2 (default: 0.2)

---

## 🧪 Testing

### Test Health Check

```bash
curl http://localhost:8000/health
```

### Test Upload

```bash
curl -X POST http://localhost:8000/api/upload-document-complete \
  -F "file=@test.txt" \
  -F "max_phrases=40" \
  -F "max_words=10"
```

### Test Knowledge Graph

```bash
# Replace {document_id} with actual ID from upload response
curl http://localhost:8000/api/knowledge-graph/doc_20260210_123456
```

### Test Flashcards

```bash
curl http://localhost:8000/api/flashcards/doc_20260210_123456
```

### Run Test Script (Windows)

```bash
TEST_ENDPOINTS.bat
```

---

## 🚀 Deployment

### Railway (Recommended)

1. Push to GitHub
2. Go to [Railway.app](https://railway.app/)
3. New Project → Deploy from GitHub
4. Select repository
5. Set root directory: `python-api`
6. Railway auto-deploys using `railway.json`

### Render

1. Go to [Render.com](https://render.com/)
2. New Web Service → Connect GitHub
3. Configure:
   - Root Directory: `python-api`
   - Build Command: `pip install -r requirements.txt && python -m spacy download en_core_web_sm && python download_nltk_data.py`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Fly.io

```bash
cd python-api
fly auth login
fly launch
```

See `../DEPLOYMENT_GUIDE.md` for detailed instructions.

---

## 📊 Performance

### Typical Processing Times

- Small document (1-2 pages): 5-10 seconds
- Medium document (5-10 pages): 15-30 seconds
- Large document (20+ pages): 30-60 seconds

### Resource Usage

- Memory: ~500MB-1GB
- CPU: 1-2 cores
- Disk: ~2GB (models + cache)

---

## 🐛 Troubleshooting

### Error: "Module not found"

```bash
pip install -r requirements.txt
```

### Error: "spacy model not found"

```bash
python -m spacy download en_core_web_sm
```

### Error: "NLTK data not found"

```bash
python download_nltk_data.py
```

### Error: "Port already in use"

Change port in `main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=8001)
```

### Error: "Document not found"

Ensure document was uploaded first and `document_id` is correct.

---

## 📝 Changelog

### v2.0 (2026-03-24) - NEW PIPELINE
- ✅ Migrated to 11-step pipeline with learned scoring
- ✅ Removed redundant Dense Retrieval stage
- ✅ Removed broken BM25 Filter stage
- ✅ Added Independent Scoring (4 signals)
- ✅ Added Learned Final Scoring (regression model)
- ✅ Added Topic Modeling (KMeans)
- ✅ Added Within-topic Ranking
- ✅ Improved flashcard generation
- ✅ Cleaned up deprecated code

---

## 📚 Documentation

- `README.md` - This file
- `../PIPELINE_COMPARISON_ANALYSIS.md` - Pipeline comparison and verification
- `NEW_PIPELINE_VIETNAMESE.md` - Vietnamese documentation
- `MERGER_V2_VIETNAMESE.md` - Merger V2 documentation
- `WORD_RANKER_VIETNAMESE.md` - Word ranker documentation

---

## 🤝 Contributing

This is a private project. For issues or questions, contact the development team.

---

## 📄 License

Proprietary - All rights reserved

---

## 👨‍💻 Author

**Kiro AI**  
Version: 2.0 (New Pipeline)  
Date: 2026-03-24

---

## 🎯 Next Steps

1. ✅ Deploy to Railway/Render
2. ✅ Test all endpoints
3. ✅ Integrate with frontend
4. ⏳ Add authentication
5. ⏳ Add rate limiting
6. ⏳ Add monitoring
7. ⏳ Add caching (Redis)
8. ⏳ Add database persistence

---

**Happy Coding! 🚀**
