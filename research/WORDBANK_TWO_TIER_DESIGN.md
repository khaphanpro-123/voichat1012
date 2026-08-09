# Wordbank hai tầng — Cold-start + Personalized

**Bản v1 — 2026-08-09**
**Bối cảnh:** cho ứng dụng chính (English-learning cho người Việt), không phải cho RCT. RCT giữ nguyên `lib/wordBank.ts` 60-từ đã pre-registered — không được đổi. Chỉ *bên ngoài* nhánh nghiên cứu (khu vực production `/dashboard-new/vocabulary/*`) mới áp cơ chế 2 tầng.

---

## 1. Vấn đề

Cách hiện tại: mỗi user tự upload document → pipeline trích từ → flashcard. Ba hệ quả:

1. **Cold-start rỗng:** user mới, chưa upload gì → không có gì để học → bỏ app.
2. **Overfit vào content người dùng:** nếu user upload 1 truyện ngắn duy nhất, hệ thống chỉ biết ~200 từ trong truyện đó.
3. **Không có baseline chung:** hai user cùng CEFR B1 nhưng học 2 tập từ hoàn toàn khác nhau → khó đo tiến bộ, khó so sánh.

## 2. Giải pháp — Wordbank 2 tầng

```
┌────────────────────────────────────────────────────────┐
│  TIER 1: Default Pool  (kho lớn, chung mọi user)       │
│  - ~500 từ B1–B2 (mở rộng dần lên 2000)                │
│  - Nguồn: AWL + New GSL + CEFR-J wordlist              │
│  - Metadata tối thiểu: word, band, POS, def, viDef     │
│  - Distractors auto-generated                          │
│  - Dùng khi: user mới, hoặc user_word_count < N_MIN    │
└────────────────────────────────────────────────────────┘
                          │
             user_word_count đạt ngưỡng
                          ↓
┌────────────────────────────────────────────────────────┐
│  TIER 2: Personalized  (từ document/chat của user)     │
│  - Từ do pipeline trích xuất từ document user upload   │
│  - Rich metadata (context, collocations từ chính doc)  │
│  - Dùng khi: user_word_count ≥ N_MIN                   │
│  - Tier 1 vẫn được xen kẽ ~20% để giữ base vocabulary  │
└────────────────────────────────────────────────────────┘
```

## 3. Chính sách chọn từ (selector policy)

Gọi `n_personal` = số từ user đã có trong `UserVocabulary` (từ pipeline). Gọi `n_review_today` = số card đến hạn hôm nay.

```
Nếu review queue hôm nay có ≥ MIN_QUEUE (=8) card đến hạn:
    → chỉ review, không thêm từ mới
Ngược lại:
    Nếu n_personal < N_MIN (=30):
        → 100% từ mới từ Default Pool, chọn theo CEFR band của user
    Nếu n_personal ≥ N_MIN:
        → 80% từ mới từ Personal (pipeline output)
          20% từ mới từ Default Pool (để giữ base vocab & tránh over-narrow)
```

Ngưỡng:
- `N_MIN = 30` — số từ tối thiểu để "personalized mode" có nghĩa. Dưới 30 thì phân bố từ upload chưa ổn định.
- `MIN_QUEUE = 8` — session review đầy đủ ≈ 8–12 card, không cần bơm thêm.
- `POOL_RATIO_AFTER = 0.20` — sau ngưỡng vẫn giữ 20% pool. Tránh trường hợp user upload toàn văn bản chuyên ngành hẹp thì mất cơ hội tiếp xúc từ AWL cơ bản.

Các hằng số này ghi trong `lib/wordBankSelector.ts` và trong `research/DESIGN_FREEZE.md` (nếu có phiên nghiên cứu song song trên production).

## 4. Cấu trúc dữ liệu

**File:** `data/wordbank_pool_seed.json`

```json
{
  "version": "1.0.0",
  "generated": "2026-08-09",
  "source": "AWL + New GSL + CEFR-J",
  "words": [
    {
      "word": "acknowledge",
      "band": "B2",
      "pos": "v",
      "definition": "to accept or admit that something is true or exists",
      "viDefinition": "thừa nhận, công nhận",
      "commonness": 4
    },
    ...
  ]
}
```

Vì pool này dùng cho MCQ ban đầu, không cần `sentences`/`collocations`/`distractors` — sinh ở runtime từ pool.

**Distractor generation:** với từ target có POS = p, pick 3 từ khác cùng POS trong pool, cùng band hoặc cách 1 band, có similarity thấp (cosine < 0.7 nếu có embedding, hoặc random pick nếu không).

## 5. Trạng thái người dùng

Thêm 2 field vào `User` model:

```ts
wordBankMode: "cold-start" | "personalized";
personalWordCount: number;  // cached, refreshed nightly
```

Transition rule (job đêm hoặc on-demand):
```
if user.personalWordCount >= N_MIN and user.wordBankMode === "cold-start":
    user.wordBankMode = "personalized"
    log analytics.transition(user._id)
```

## 6. Đo lường — quality gate

Đưa 3 chỉ số vào dashboard admin:

- **% user cold-start hôm nay** — quá cao (>60%) sau tuần đầu = có vấn đề upload flow.
- **Ngày median chuyển từ cold-start → personalized** — target < 14 ngày.
- **Retention Day-7 chia theo mode** — nếu personalized retention < cold-start, cơ chế transition có vấn đề.

## 7. Không ảnh hưởng nghiên cứu

**Cách ly nghiêm ngặt:**
- `lib/wordBank.ts` (60 từ pre-registered) — không đổi, không đọc pool.
- `research/*` — không import `lib/defaultWordBankPool.ts` hay `lib/wordBankSelector.ts`.
- Nhánh nghiên cứu (`condition ∈ {DART, HLR, SM-2}`) chỉ dùng 60-word bank.
- Nhánh production `/dashboard-new/vocabulary` dùng 2-tier.

Ràng buộc này ghi trong `.eslintrc` custom rule (optional) hoặc chỉ code review manual.

## 8. Kế hoạch mở rộng pool

- **Bước 1 (Ngày 8):** 100 từ seed từ AWL Sublist 1–3, hand-curated. Đã có trong `data/wordbank_pool_seed.json`.
- **Bước 2 (Ngày 15):** mở rộng lên 300 từ với AWL Sublist 4–7 + top 200 New GSL không trùng.
- **Bước 3 (Ngày 30):** mở rộng lên 500–1000 từ, import từ CEFR-J JSON public (CC-BY).
- **Bước 4 (Post-pilot):** cho phép admin nạp domain-specific pool (IELTS core, TOEFL, ngành cụ thể).

## 9. Rủi ro

- **Pool trùng với 60-từ nghiên cứu:** nếu user pilot cũng dùng production app, họ tiếp xúc với từ nghiên cứu qua pool → contamination. **Mitigation:** trong pilot period (Ngày 29–36), pool tự động loại 60 từ nghiên cứu cho user đang enrol.
- **Chất lượng definition:** pool viết tay có thể sai định nghĩa. **Mitigation:** import từ nguồn có kiểm định (Cambridge English Dictionary API hoặc CEFR-J), không tự viết.
- **Distractor generated auto có thể quá dễ hoặc quá khó:** cần A/B test độ khó MCQ sinh tự động vs hand-curated.
