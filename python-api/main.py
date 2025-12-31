"""
Visual Language Tutor - Backend API
Tích hợp YOLO Custom + OCR + GPT-4o
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import shutil
import os
import json
from datetime import datetime
import hashlib

# Import AI modules
from ultralytics import YOLO
import easyocr
from openai import OpenAI
from PIL import Image
import numpy as np

# ==================== CONFIGURATION ====================

app = FastAPI(title="Visual Language Tutor API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("cache", exist_ok=True)
os.makedirs("models", exist_ok=True)

# AI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-api-key-here")
YOLO_MODEL_PATH = "models/custom_yolo.pt"  # Model custom của bạn
CONFIDENCE_THRESHOLD = 0.4

# Initialize AI Models
print("🔄 Loading AI models...")

try:
    yolo_model = YOLO(YOLO_MODEL_PATH)
    print("✅ YOLO Custom model loaded")
except:
    # Fallback to standard YOLO if custom not available
    yolo_model = YOLO("yolov8n.pt")
    print("⚠️  Using standard YOLOv8n (replace with custom model)")

ocr_reader = easyocr.Reader(['en', 'vi'], gpu=False)
print("✅ OCR model loaded")

openai_client = OpenAI(api_key=OPENAI_API_KEY)
print("✅ OpenAI client initialized")


# ==================== DATA MODELS ====================

class VocabularyItem(BaseModel):
    word: str
    ipa: str
    meaning_vi: str
    part_of_speech: str
    example_sentence: str
    confidence: float = 1.0


class AnalysisResponse(BaseModel):
    image_id: str
    timestamp: str
    detections: dict
    vocabulary: List[dict]
    sentences: List[str]
    ocr_texts: List[str]
    cache_hit: bool


# ==================== HELPER FUNCTIONS ====================

def generate_image_hash(image_path: str) -> str:
    """Generate unique hash for image caching"""
    with open(image_path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


def check_cache(image_hash: str) -> Optional[dict]:
    """Check if analysis exists in cache"""
    cache_file = f"cache/{image_hash}.json"
    if os.path.exists(cache_file):
        with open(cache_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def save_cache(image_hash: str, data: dict):
    """Save analysis to cache"""
    cache_file = f"cache/{image_hash}.json"
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ==================== AI PROCESSING ====================

def detect_with_yolo(image_path: str) -> dict:
    """Nhận dạng vật thể với YOLO"""
    results = yolo_model(image_path, conf=CONFIDENCE_THRESHOLD)
    
    detections = {
        "objects": [],
        "total_count": 0
    }
    
    for r in results:
        for box in r.boxes:
            label = yolo_model.names[int(box.cls)]
            confidence = float(box.conf)
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            
            detection = {
                "label": label,
                "label_vi": translate_label(label),
                "confidence": round(confidence, 3),
                "bbox": [int(x1), int(y1), int(x2), int(y2)]
            }
            detections["objects"].append(detection)
    
    detections["total_count"] = len(detections["objects"])
    return detections


def translate_label(label: str) -> str:
    """Dịch label sang tiếng Việt (basic)"""
    translations = {
        "person": "người",
        "car": "xe hơi",
        "dog": "con chó",
        "cat": "con mèo",
        "chair": "ghế",
        "table": "bàn",
        "book": "sách",
        "phone": "điện thoại",
        "laptop": "máy tính xách tay",
        "bottle": "chai",
        "cup": "cốc",
        "tv": "tivi",
        "bed": "giường",
        "clock": "đồng hồ",
        "keyboard": "bàn phím",
        "mouse": "chuột máy tính",
        "backpack": "ba lô",
        "umbrella": "ô/dù",
        "handbag": "túi xách",
        "bicycle": "xe đạp",
        "motorcycle": "xe máy",
        "bus": "xe buýt",
        "train": "tàu hỏa",
        "airplane": "máy bay",
        "bird": "chim",
        "horse": "ngựa",
        "cow": "bò",
        "sheep": "cừu",
        "elephant": "voi",
        "bear": "gấu",
        "zebra": "ngựa vằn",
        "giraffe": "hươu cao cổ",
    }
    return translations.get(label.lower(), label)


def extract_text_ocr(image_path: str) -> List[str]:
    """OCR toàn bộ ảnh"""
    try:
        results = ocr_reader.readtext(image_path, detail=0)
        # Filter meaningful text
        texts = [t.strip() for t in results if len(t.strip()) > 2 and any(c.isalpha() for c in t)]
        return texts
    except Exception as e:
        print(f"OCR Error: {e}")
        return []


def generate_vocabulary_with_gpt(detections: dict, ocr_texts: List[str]) -> dict:
    """Gọi GPT-4o để sinh từ vựng"""
    
    object_labels = [d["label"] for d in detections["objects"]]
    
    if not object_labels and not ocr_texts:
        return {
            "vocabulary": [],
            "sentences": [],
            "summary": "No content detected in image."
        }
    
    prompt = f"""You are an English tutor for Vietnamese A2-B1 learners.

DETECTED IN IMAGE:
- Objects: {object_labels[:10]}
- Text (OCR): {ocr_texts[:10]}

TASKS:
1. Extract 5-8 useful English vocabulary words
2. For each word provide:
   - IPA pronunciation
   - Vietnamese meaning
   - Part of speech (noun/verb/adj/adv)
   - One simple example sentence (A2 level)
3. Create 2-3 simple sentences about the image

RESPONSE FORMAT (JSON only):
{{
  "vocabulary": [
    {{
      "word": "education",
      "ipa": "/ˌedʒuˈkeɪʃn/",
      "meaning_vi": "giáo dục",
      "part_of_speech": "noun",
      "example_sentence": "Education is important."
    }}
  ],
  "sentences": [
    "I can see a person in the image.",
    "There is a book on the table."
  ]
}}

Output valid JSON only. A2 level vocabulary."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful English tutor. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=1500
        )
        
        content = response.choices[0].message.content
        
        # Remove markdown code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
        
        result = json.loads(content.strip())
        return result
        
    except Exception as e:
        print(f"GPT Error: {e}")
        return {
            "vocabulary": [],
            "sentences": [],
            "error": str(e)
        }


# ==================== API ENDPOINTS ====================

@app.get("/")
def root():
    return {
        "message": "Visual Language Tutor API",
        "version": "1.0.0",
        "status": "running",
        "models": {
            "yolo": "loaded",
            "ocr": "loaded",
            "gpt": "connected"
        }
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "yolo_model": YOLO_MODEL_PATH,
        "ocr_languages": ["en", "vi"]
    }


@app.post("/api/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    """Main endpoint: Phân tích ảnh và sinh từ vựng"""
    
    try:
        # Save uploaded file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        image_path = f"uploads/{filename}"
        
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Generate hash for caching
        image_hash = generate_image_hash(image_path)
        
        # Check cache
        cached_result = check_cache(image_hash)
        if cached_result:
            print(f"✅ Cache hit: {image_hash}")
            cached_result["cache_hit"] = True
            return JSONResponse(content=cached_result)
        
        print(f"🔍 Processing new image: {filename}")
        
        # Step 1: YOLO Detection
        detections = detect_with_yolo(image_path)
        print(f"   Found {detections['total_count']} objects")
        
        # Step 2: OCR
        ocr_texts = extract_text_ocr(image_path)
        print(f"   OCR found {len(ocr_texts)} text segments")
        
        # Step 3: GPT sinh từ vựng
        learning_content = generate_vocabulary_with_gpt(detections, ocr_texts)
        
        # Prepare response
        result = {
            "success": True,
            "image_id": image_hash,
            "timestamp": datetime.now().isoformat(),
            "detections": detections,
            "ocr_texts": ocr_texts,
            "vocabulary": learning_content.get("vocabulary", []),
            "sentences": learning_content.get("sentences", []),
            "cache_hit": False
        }
        
        # Save to cache
        save_cache(image_hash, result)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== RUN SERVER ====================

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Visual Language Tutor API on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
