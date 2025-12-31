# Visual Language Tutor - Python API

Backend API sử dụng YOLO + OCR + GPT-4o để phân tích ảnh và sinh từ vựng tiếng Anh.

## Cài đặt

```bash
cd python-api
pip install -r requirements.txt
```

## Cấu hình

1. Đặt OpenAI API key:
```bash
export OPENAI_API_KEY="your-api-key"
```

2. (Optional) Đặt YOLO model custom vào `models/custom_yolo.pt`

## Chạy server

```bash
python main.py
```

Server sẽ chạy tại: http://localhost:8000

## API Endpoints

### GET /
Health check

### POST /api/analyze-image
Upload ảnh để phân tích

**Request:** multipart/form-data với field `file`

**Response:**
```json
{
  "success": true,
  "image_id": "abc123",
  "detections": {
    "objects": [
      {"label": "person", "label_vi": "người", "confidence": 0.95, "bbox": [x1,y1,x2,y2]}
    ]
  },
  "ocr_texts": ["text found in image"],
  "vocabulary": [
    {
      "word": "person",
      "ipa": "/ˈpɜːrsn/",
      "meaning_vi": "người",
      "part_of_speech": "noun",
      "example_sentence": "I see a person."
    }
  ],
  "sentences": ["There is a person in the image."]
}
```

## Kiến trúc

```
Image Upload
    ↓
YOLO Detection (objects)
    ↓
EasyOCR (text in image)
    ↓
GPT-4o (vocabulary generation)
    ↓
JSON Response
```
