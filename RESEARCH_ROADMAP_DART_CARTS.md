# Lộ trình nghiên cứu DART + CARTS → bài báo Q2

> Cập nhật: 2026-08-02 · Dựa trên audit thực tế codebase `voichat1012` + tài liệu `SRS - SM2.md`, `PAPER (IJERI).md`, `IMPLEMENTATION_LOG.md`

---

## PHẦN 0 — Chẩn đoán hiện trạng (đọc phần này trước)

### 0.1 Code đã có gì (audit thật, không phải theo log)

| Thành phần | File | Dòng | Trạng thái |
|---|---|---|---|
| DART inference | `lib/dart.ts` | 131 | ✅ Thật |
| DART weight loader | `lib/dartWeights.ts` | 67 | ✅ Thật |
| Context diversity (max-min) | `lib/contextDiversity.ts` | 79 | ✅ Thật |
| Context pool (Pinecone→Cohere→hash) | `lib/contextPool.ts` | 111 | ✅ Thật |
| LLM-as-Judge | `lib/contextTransferJudge.ts` | 84 | ⚠️ Chưa validate với người |
| Retrieval task generator (d=0..3) | `lib/retrievalTaskGenerator.ts` | 82 | ✅ Thật |
| Experiment assignment (FNV-1a) | `lib/experimentAssignment.ts` | 37 | ⚠️ 6 nhánh — quá nhiều |
| Baselines HLR / KARL / LECTOR | `lib/baselines/*.ts` | 45/51/70 | ⚠️ Bản rút gọn, không phải re-implement gốc |
| `ReviewLog` model | `app/models/ReviewLog.ts` | 39 | ✅ Đủ trường cho Alg 1 |
| API `/api/dart/schedule` | route.ts | 58 | ✅ |
| API `/api/carts/schedule` | route.ts | 114 | ⚠️ "CARTS-lite" — lõi vẫn là DART |
| API `/api/context-transfer/judge` | route.ts | 52 | ✅ |
| Trainer DART | `python-api/train_dart.py` | 131 | ✅ Nhưng **chưa có data để train** |
| Trainer CARTS PPO | `python-api/train_carts_ppo.py` | 180 | ❌ Scaffold, rollout để trống |
| UI DART Lab | `app/dashboard-new/dart-lab/page.tsx` | 363 | ⚠️ Debug tool, không phải UI học viên |
| Tests | 3 file | 180 | ✅ 20 tests pass |

**Kết luận: hạ tầng kỹ thuật ~70% xong. Nhưng phần quyết định bài báo Q2 thì gần như 0%.**

### 0.2 Bốn rủi ro chí mạng (phải xử lý trước khi viết một chữ nào)

**RỦI RO 1 — Kết quả trong draft là số giả định.**
`SRS - SM2.md` đã ghi sẵn: CARTS 83.5%, DART 76.8%, ablation −11.4%/−13.1%/−5.7%, β = 0.0191, Cohen's d = 0.375. Nhưng `train_dart.py` chưa từng chạy trên dữ liệu thật (chưa có `dart_weights.json`), và `train_carts_ppo.py` chưa có rollout. **Đây là lý do bị reject/retract số 1 ở tạp chí Q1–Q2.** Xoá toàn bộ số này khỏi draft ngay, chỉ điền lại sau khi có log thật.

**RỦI RO 2 — Mâu thuẫn cỡ mẫu trong chính tài liệu của bạn.**
- Abstract: "60 L2 English learners, 8-week"
- Bảng METHOD: "Above 6 months, roughly 200 members, three groups"
- `PAPER (IJERI).md`: "200 high school and college students"

Reviewer sẽ bắt ngay. Phải chốt **một** con số và giữ nhất quán ở mọi chỗ.

**RỦI RO 3 — Thiết kế 6 nhánh với N nhỏ = vô nghĩa thống kê.**
`experimentAssignment.ts` chia 6 điều kiện. Với N = 60 → 10 người/nhánh. Để phát hiện hiệu ứng vừa (f = 0.25, α = .05, power = .80) trong ANOVA 6 nhóm cần **≈ 210 người**. Với 10/nhánh bạn chỉ phát hiện được f ≈ 0.55 (hiệu ứng cực lớn) — nghĩa là kết quả hoặc âm tính, hoặc dương tính giả.

**RỦI RO 4 — PPO không thể học từ 60 học viên.**
CARTS cần hàng trăm nghìn transition. Một học viên × 8 tuần × 50 từ ≈ vài nghìn review. Toàn bộ nghiên cứu sẽ cho ~100–200k review là tối đa lạc quan — và PPO cần dữ liệu *on-policy*, tức là phải học trong lúc chạy. Không khả thi trong 8 tuần.

---

## PHẦN 1 — Quyết định chiến lược (đọc kỹ, đây là phần thay đổi cuộc chơi)

### 1.1 Tách bài báo thành 2 bài, không cố nhồi 1 bài

| | **Bài A (nộp trước, Q2)** | **Bài B (nộp sau, Q1/hội nghị)** |
|---|---|---|
| Trọng tâm | **DART** + ContextTransfer metric | **CARTS** (PPO đầy đủ) |
| Đóng góp | HLR có điều kiện độ khó + thang đo transfer + RCT lớp học | Deep RL joint scheduling |
| Dữ liệu cần | Log review thật + posttest | Log lớn hơn + simulator + sim-to-real |
| Nhánh thực nghiệm | 3 (SM-2, HLR, DART) | 5–6 |
| Thời gian tới nộp | **~5–6 tháng** | 12–18 tháng |
| Rủi ro | Thấp — mô hình tham số, có thể kiểm chứng | Cao — RL cần data khổng lồ |

**Khuyến nghị mạnh: làm Bài A trước.** DART một mình đã đủ novelty cho Q2: chưa ai điều kiện hoá forgetting rate theo *định dạng truy hồi*. Cố nhét PPO vào sẽ khiến reviewer đòi bằng chứng RL mà bạn không có.

### 1.2 Chốt thiết kế thực nghiệm Bài A

```
N = 150–180 học viên EFL Việt Nam (dự phòng rơi rụng 20% → tuyển 200)
3 nhánh × 50–60 người:
  G1 (control)  SM-2         — flashcard tĩnh, chỉ nhận diện
  G2 (baseline) HLR          — timing tối ưu, format tĩnh
  G3 (đề xuất)  DART         — timing + retrieval type thích ứng
Thời lượng: 8 tuần can thiệp + posttest tuần 10 (delayed) 
Randomize: phân tầng theo CEFR pretest (A2/B1/B2)
```

So sánh 6 phương pháp (thêm KARL, LECTOR, CARTS-lite) **chạy offline trên cùng bộ log** — đây là "simulation study" hợp lệ, không cần thêm người.

---

## PHẦN 2 — Lộ trình 5 lớp kỹ thuật

### 2.1 FRONTEND

**Vấn đề hiện tại:** `dart-lab/page.tsx` là công cụ debug cho *bạn*, không phải giao diện cho *học viên*. Không có UI nào để học viên thực sự làm 4 loại retrieval task.

| # | Việc | Ưu tiên | Ước tính |
|---|---|---|---|
| F1 | **Component 4 loại retrieval task** — `RecognitionMCQ`, `ClozeInput`, `ConstrainedGen`, `ParaphraseTask`. Interface chung `{ task, onSubmit(answer, elapsedMs) }` | 🔴 Chặn nghiên cứu | 5 ngày |
| F2 | **Đo response time chính xác** — `performance.now()` từ lúc render xong đến lúc submit. Loại bỏ thời gian tải mạng. Đây là `RT_i` trong reward CARTS và là biến kiểm soát trong Bài A | 🔴 | 1 ngày |
| F3 | **Review session runner** — hàng đợi từ, gọi `/api/dart/schedule`, render task đúng type, submit, chuyển từ tiếp | 🔴 | 4 ngày |
| F4 | **Consent + pretest flow** — màn hình đồng ý tham gia (bắt buộc cho IRB), thông tin nhân khẩu, CEFR placement test | 🔴 | 3 ngày |
| F5 | **Posttest module** — immediate (tuần 8) + delayed (tuần 10), có cả recall test và transfer test (viết câu trong ngữ cảnh mới) | 🔴 | 4 ngày |
| F6 | **Ẩn hoàn toàn điều kiện thí nghiệm** — học viên không được biết mình ở nhánh nào; UI phải giống hệt nhau giữa 3 nhánh trừ nội dung task | 🔴 Tính hợp lệ | 1 ngày |
| F7 | Dashboard tiến độ học viên (giữ động lực, giảm dropout) | 🟡 | 3 ngày |
| F8 | Bảng điều khiển nghiên cứu viên: tỷ lệ tuân thủ, dropout theo nhánh, cảnh báo học viên bỏ | 🟡 | 3 ngày |
| F9 | Offline-tolerant (lưu tạm câu trả lời khi mất mạng) — VN mạng học sinh không ổn định | 🟢 | 2 ngày |

**Chi tiết quan trọng cho F6:** nếu nhánh DART hiển thị task đa dạng còn nhánh SM-2 chỉ có flashcard, học viên sẽ tự biết. Cách xử lý: nói với tất cả rằng "hệ thống sẽ đưa nhiều dạng bài" và nhánh control vẫn được xem là bản hệ thống đầy đủ. Ghi rõ trong Limitations.

### 2.2 BACKEND

| # | Việc | Ưu tiên | Ghi chú |
|---|---|---|---|
| B1 | **Endpoint `/api/review/submit` hợp nhất** — hiện `vocabulary-review`, `dart/schedule`, `carts/schedule` chồng chéo. Cần 1 đường vào duy nhất ghi log nhất quán | 🔴 | Log thiếu nhất quán = mất dữ liệu không cứu được |
| B2 | **Idempotency + chống mất log** — mỗi submit có `clientEventId` UUID, unique index. Retry mạng không được tạo bản ghi trùng | 🔴 | Dữ liệu bẩn giết bài báo |
| B3 | **Đóng băng phiên bản scheduler** — thêm `schedulerVersion` + `weightsVersion` vào mỗi `ReviewLog`. Nếu bạn retrain giữa chừng mà không ghi version thì log trước/sau không so sánh được | 🔴 | Reviewer sẽ hỏi |
| B4 | **Server-side timestamp** — không tin `Date.now()` từ client (múi giờ, đồng hồ lệch). Δ ngày phải tính từ server | 🔴 | |
| B5 | **Endpoint export dữ liệu** `/api/research/export` — dump CSV/JSONL ẩn danh cho phân tích R/Python | 🔴 | |
| B6 | **Tách LLM-Judge ra async queue** — hiện gọi đồng bộ, sẽ timeout Vercel 10s khi tải cao. Đẩy vào queue có sẵn (`lib/queue.ts`) | 🟡 | |
| B7 | **Cache task đã sinh** — cùng (word, d, contextId) không gọi LLM lại. Vừa tiết kiệm chi phí vừa đảm bảo học viên cùng nhánh nhận task tương đương | 🟡 | Ảnh hưởng tính hợp lệ nội bộ |
| B8 | **Rate limit + fallback provider** — nếu Groq/OpenAI hết quota giữa buổi học, học viên bị kẹt → dropout | 🟡 | |
| B9 | Health check + alert khi tỷ lệ lỗi > 2% | 🟢 | |

### 2.3 DATABASE

`ReviewLog` hiện tại thiếu nhiều trường cần cho phân tích. Đề xuất schema mở rộng:

```ts
// app/models/ReviewLog.ts — bổ sung
clientEventId:    string;   // UUID, unique — chống trùng
sessionId:        string;   // gom review cùng một buổi
condition:        'sm2'|'hlr'|'dart'|'karl'|'lector'|'carts';
schedulerVersion: string;   // 'dart@1.2.0'
weightsVersion:   string;   // hash của dart_weights.json
scheduledAt:      Date;     // hệ thống hẹn lúc nào
servedAt:         Date;     // thực tế học viên làm lúc nào  → độ trễ tuân thủ
elapsedMs:        number;   // đo bằng performance.now() phía client
serverDeltaDays:  number;   // Δ tính bởi server
taskPromptHash:   string;   // truy vết lại đúng prompt đã dùng
contextEmbedding: number[]; // hoặc contextId trỏ sang collection riêng
isCatchUp:        boolean;  // review trễ hạn (quan trọng: gây nhiễu Δ)
```

**Collection mới cần tạo:**

| Collection | Mục đích |
|---|---|
| `Participant` | consent, CEFR pretest, nhân khẩu, nhánh, ngày enroll, ngày dropout |
| `TestResult` | pretest / immediate posttest / delayed posttest, tách điểm recall vs transfer |
| `ContextItem` | pool ngữ cảnh có embedding, để tái lập được thí nghiệm |
| `JudgeScore` | điểm LLM-Judge + điểm người chấm (cho ICC) |

**Việc DB:**

| # | Việc | Ưu tiên |
|---|---|---|
| D1 | Mở rộng `ReviewLog` như trên + migration script | 🔴 |
| D2 | Tạo 4 collection mới | 🔴 |
| D3 | **Unique index `{clientEventId}`** + compound `{userId, condition, createdAt}` | 🔴 |
| D4 | **Tách DB nghiên cứu khỏi DB sản phẩm** — hoặc ít nhất prefix collection. Không để dữ liệu người dùng thường lẫn vào phân tích | 🔴 |
| D5 | **Backup tự động hàng ngày** trong suốt 8 tuần. Mất log = mất cả nghiên cứu, không làm lại được | 🔴 |
| D6 | Script ẩn danh hoá (hash userId → participant code) trước khi export | 🔴 IRB yêu cầu |
| D7 | Cảnh giác giới hạn M0 Atlas (512MB, 500 connection). 180 học viên × 8 tuần có thể chạm trần → cân nhắc nâng M10 | 🟡 |

### 2.4 THUẬT TOÁN

| # | Việc | Ưu tiên | Chi tiết |
|---|---|---|---|
| A1 | **Train DART thật** trên log pilot | 🔴 | `train_dart.py` đã sẵn sàng. Cần ≥ 5.000 review mới ổn định θ, α |
| A2 | **Kiểm định α > 0 có ý nghĩa thống kê** | 🔴 | Đây *chính là* RQ1. Bootstrap 1000 lần → CI 95% của α. Nếu CI chứa 0 → DART không khác HLR → phải xoay hướng bài báo |
| A3 | **5-fold CV theo học viên** (không phải theo dòng) | 🔴 | Chia theo dòng sẽ rò rỉ dữ liệu → AUC ảo cao. Reviewer sẽ bắt |
| A4 | **So sánh HLR vs DART bằng DeLong test** (AUC) + likelihood-ratio test (mô hình lồng nhau) | 🔴 | Vì HLR = DART với α=0 → LRT là kiểm định chuẩn xác nhất |
| A5 | **Calibration curve + Brier score**, không chỉ AUC | 🟡 | SRS cần xác suất *hiệu chỉnh tốt*, không chỉ xếp hạng tốt |
| A6 | **Re-implement KARL, LECTOR trung thực hơn** | 🟡 | Bản hiện tại (51 và 70 dòng) là rút gọn. Reviewer biết 2 paper này sẽ phản đối. Hoặc dùng code gốc tác giả, hoặc ghi rõ "simplified re-implementation" trong Limitations |
| A7 | **Validate LLM-as-Judge với người** | 🔴 | Lấy ~200 câu trả lời, 2–3 giám khảo người chấm độc lập theo cùng rubric → tính ICC(2,k) và Krippendorff's α. Cần ICC > .75. **Không có bước này thì ContextTransfer metric không được công nhận** |
| A8 | **Ablation trên log (offline)** | 🟡 | DART-noDifficulty, DART-fixedType... chạy lại trên cùng log, không cần thêm người |
| A9 | Xây simulator học viên (cho Bài B) | 🟢 | Hoãn sang Bài B |
| A10 | PPO training (cho Bài B) | 🟢 | Hoãn |

**Cảnh báo A2:** hãy chuẩn bị tinh thần α có thể không có ý nghĩa. Nếu vậy, bài báo vẫn cứu được bằng cách đổi khung: "chúng tôi kiểm định giả thuyết độ khó truy hồi điều biến tốc độ quên, và tìm thấy [kết quả]". Kết quả âm tính vẫn đăng được nếu thiết kế chặt — nhưng chỉ khi bạn *chưa* hứa hẹn con số cụ thể trong abstract.

### 2.5 PHÂN TÍCH THỐNG KÊ (lớp thứ 5 — thường bị bỏ quên)

```r
# Mô hình chính cho RQ2 — hồi quy hỗn hợp, KHÔNG dùng t-test thô
recall ~ condition * week + cefr_pretest + (1 | learner) + (1 | word)

# Transfer score
transfer ~ condition + cefr_pretest + (1 | learner) + (1 | word)

# Hiệu chỉnh đa so sánh: Holm–Bonferroni
# Effect size: Cohen's d kèm CI 95% bootstrap
# Xử lý dropout: intention-to-treat + phân tích nhạy cảm
```

**Bắt buộc:** tính power *trước* khi thu dữ liệu, ghi vào pre-registration. Dùng `simr` (R) hoặc mô phỏng.

---

## PHẦN 3 — Lộ trình thời gian (mốc tới nộp bài)

### Tháng 1 — Hạ tầng + đạo đức nghiên cứu

| Tuần | Việc |
|---|---|
| 1 | Chốt thiết kế (3 nhánh, N=180). **Nộp hồ sơ đạo đức nghiên cứu (IRB)** — đây là đường găng, có thể mất 4–8 tuần. Làm ngay ngày đầu |
| 1–2 | B1–B4, D1–D3 (backend + schema) |
| 2–3 | F1–F3 (UI 4 retrieval task + session runner) |
| 3–4 | F4–F6 (consent, pretest, ẩn điều kiện). Soạn bộ 200–300 từ mục tiêu + pool ngữ cảnh |
| 4 | **Pre-registration** trên OSF hoặc AsPredicted (miễn phí, tăng mạnh khả năng được nhận) |

### Tháng 2 — Pilot + huấn luyện DART

| Tuần | Việc |
|---|---|
| 5 | Pilot 15–20 người, 2 tuần. Mục tiêu: bắt lỗi UI, đo thời gian làm bài thật, kiểm tra log không mất |
| 6 | Sửa lỗi từ pilot. Kiểm định chất lượng log (có bao nhiêu % dòng thiếu trường?) |
| 7 | **A1–A5**: train DART trên log pilot, kiểm định α, CV theo học viên. **Điểm quyết định:** nếu α không có ý nghĩa → họp lại, xoay hướng |
| 8 | **A7**: validate LLM-Judge với giám khảo người. Tuyển 2 giáo viên tiếng Anh chấm 200 mẫu |

### Tháng 3–4 — Nghiên cứu chính (8 tuần)

| Tuần | Việc |
|---|---|
| 9 | Tuyển 200 người, pretest CEFR, randomize phân tầng |
| 9–16 | Can thiệp 8 tuần. **Song song: viết Introduction + Related Work + Method** (không chờ kết quả) |
| 13 | Kiểm tra giữa kỳ: tỷ lệ tuân thủ, dropout theo nhánh. Nếu 1 nhánh dropout cao bất thường → ghi nhận, đây là phát hiện |
| 16 | Immediate posttest |
| 18 | **Delayed posttest (tuần 10)** — quan trọng nhất, đây là số liệu về retention dài hạn |

### Tháng 5 — Phân tích + viết

| Tuần | Việc |
|---|---|
| 19–20 | Làm sạch dữ liệu, mô hình hỗn hợp, effect size, ablation offline |
| 21–22 | Viết Results + Discussion + Limitations |
| 23 | Vẽ hình (5–7 hình chất lượng xuất bản), bảng |
| 24 | Đọc soát nội bộ + hiệu đính tiếng Anh chuyên nghiệp |

### Tháng 6 — Nộp

| Tuần | Việc |
|---|---|
| 25 | Format theo tạp chí, cover letter, đề xuất reviewer |
| 26 | **Nộp** |

**Tổng: ~6 tháng.** Đường găng là IRB (làm ngay) và 8 tuần can thiệp (không rút ngắn được).

---

## PHẦN 4 — Viết bài báo Q2

### 4.1 Chọn tạp chí

Ứng viên phù hợp chủ đề (CALL / công nghệ giáo dục / SLA). **Luôn kiểm tra lại quartile hiện hành trên Scimago (scimagojr.com) trước khi nộp — thứ hạng thay đổi hàng năm:**

| Tạp chí | Nhận xét phù hợp |
|---|---|
| **Education and Information Technologies** (Springer) | Rất hợp: chấp nhận nghiên cứu hệ thống + RCT lớp học, chu kỳ phản biện tương đối nhanh, thân thiện với tác giả châu Á |
| **Interactive Learning Environments** (Taylor & Francis) | Hợp với can thiệp có hệ thống thích ứng |
| **Smart Learning Environments** (Springer, OA) | Open access, hợp với "adaptive learning system" |
| **IEEE Transactions on Learning Technologies** | Nghiêng kỹ thuật hơn — hợp nếu nhấn mạnh phần thuật toán |
| **Journal of Educational Computing Research** | Truyền thống, chuộng thiết kế thực nghiệm chặt |
| **Computer Assisted Language Learning** (Q1) | Đích cao hơn — cân nhắc nếu kết quả mạnh |

**Chiến lược:** nhắm 1 tạp chí Q1 trước (CALL hoặc ReCALL). Nếu desk-reject → chuyển ngay xuống Q2. Chi phí chỉ là 2–4 tuần nhưng upside lớn.

### 4.2 Khung bài Bài A (DART)

```
1. Introduction                                    ~1.200 từ
   - SRS tối ưu "khi nào"; content-aware tối ưu "cái nào"
   - Chưa ai tối ưu "như thế nào" (định dạng truy hồi)
   - Neo lý thuyết: Desirable Difficulties (Bjork)
   - Đóng góp: (i) DART, (ii) ContextTransfer metric, (iii) RCT 8 tuần

2. Related Work                                    ~1.800 từ
   2.1 Spaced repetition: SM-2 → HLR → FSRS
   2.2 Content-aware scheduling: KARL, LECTOR
   2.3 Retrieval practice & desirable difficulties
   2.4 Đánh giá từ vựng vượt ngoài recall
   2.5 Bảng so sánh + khe hở nghiên cứu

3. Method                                          ~2.500 từ
   3.1 Công thức DART: h = 2^(θᵀx) · e^(α·φ(d))
       — nói rõ HLR là trường hợp lồng nhau khi α=0
   3.2 Bốn định dạng truy hồi + căn cứ lý thuyết cho φ
   3.3 ContextTransfer metric + quy trình validate với người chấm
   3.4 Thiết kế thực nghiệm: người tham gia, ngẫu nhiên hoá, tài liệu
   3.5 Đo lường: pretest / immediate / delayed
   3.6 Kế hoạch phân tích (khai báo trước)

4. Results                                         ~1.800 từ
   4.1 RQ1: DART vs HLR trên log giữ lại (LRT, AUC, Brier, calibration)
   4.2 RQ2: kết quả học tập giữa 3 nhánh (mô hình hỗn hợp)
   4.3 RQ3: độ tin cậy LLM-Judge (ICC, Krippendorff's α)
   4.4 Ablation offline

5. Discussion                                      ~1.500 từ
6. Limitations                                     ~500 từ
7. Conclusion                                      ~400 từ
```

### 4.3 Quy tắc viết — những điều reviewer Q2 bắt lỗi nhiều nhất

| Lỗi | Cách tránh |
|---|---|
| Số liệu viết trước khi có dữ liệu | Để trống `[XX.X]` trong draft, chỉ điền sau khi phân tích |
| Không có power analysis | Đưa vào Method, tính trước khi thu dữ liệu |
| Chia CV theo dòng thay vì theo người | Nói rõ "learner-level 5-fold CV" |
| Baseline yếu / cài đặt sơ sài | Thừa nhận trong Limitations, hoặc dùng code gốc |
| Metric mới không validate | ICC với người chấm — bắt buộc |
| Không có delayed posttest | Đây là điểm mạnh của bạn, nhấn mạnh |
| Thiếu tuyên bố đạo đức | Ghi rõ mã số IRB, consent, ẩn danh |
| Thiếu tuyên bố về AI | Nhiều tạp chí nay bắt buộc khai báo dùng LLM ở khâu nào |
| Không chia sẻ dữ liệu/code | Đưa lên OSF/Zenodo, có DOI — tăng điểm rõ rệt |
| Tiếng Anh không chuẩn | Thuê hiệu đính chuyên nghiệp. `PAPER (IJERI).md` hiện có nhiều câu chưa mạch lạc |

### 4.4 Về `PAPER (IJERI).md` — cảnh báo riêng

File đó là bài L2-BRAIN, chủ đề khác (Krashen SLA). **Không trộn hai bài.** Nếu cả hai dùng chung nền tảng hệ thống thì phải trích dẫn chéo và nêu rõ khác biệt, nếu không sẽ bị coi là **salami slicing** (chia nhỏ một nghiên cứu thành nhiều bài) — lỗi đạo đức xuất bản nghiêm trọng.

Ngoài ra `PAPER (IJERI).md` hiện ghi "11-step pipeline" trong khi codebase là 8 bước — sửa cho khớp.

---

## PHẦN 5 — Checklist hành động 30 ngày tới

**Tuần này:**

- [ ] Chốt: làm Bài A (DART) trước, hoãn CARTS/PPO
- [ ] Chốt N và số nhánh, sửa nhất quán trong mọi tài liệu
- [ ] **Nộp hồ sơ IRB** (đường găng dài nhất)
- [ ] Xoá mọi số liệu giả khỏi `SRS - SM2.md`, đánh dấu `[TBD]`
- [ ] Sửa `experimentAssignment.ts`: 6 nhánh → 3
- [ ] Commit + push code hiện có lên GitHub (đang còn 1 commit chưa đẩy)

**Tuần 2–3:**

- [ ] B1–B4 (backend hợp nhất, idempotency, versioning, server timestamp)
- [ ] D1–D5 (schema, collection mới, index, tách DB, backup)
- [ ] F1–F3 (UI 4 retrieval task)

**Tuần 4:**

- [ ] F4–F6 (consent, pretest, ẩn điều kiện)
- [ ] Soạn bộ từ mục tiêu + pool ngữ cảnh
- [ ] Pre-register trên OSF
- [ ] Bắt đầu viết Introduction + Related Work

---

## Phụ lục — Công thức DART cần trình bày chính xác trong bài

$$h_i = 2^{\theta^\top x_i} \cdot e^{\alpha \varphi(d_i)}, \qquad \varphi(d) \in \{0,\ 0.33,\ 0.66,\ 1.0\}$$

$$p_i = 2^{-\Delta_i / h_i}$$

$$\mathcal{L}(\theta,\alpha) = -\frac{1}{N}\sum_i \big[r_i \log p_i + (1-r_i)\log(1-p_i)\big] + \lambda\|\theta\|^2$$

Ràng buộc $\alpha \geq 0$ (độ khó cao hơn → half-life dài hơn, theo giả thuyết desirable difficulty).

**Giả thuyết kiểm định (RQ1):** $H_0: \alpha = 0$ (DART thoái hoá về HLR) vs $H_1: \alpha > 0$.
Kiểm định: likelihood-ratio test, $\chi^2$ với 1 bậc tự do + bootstrap CI cho $\alpha$.

Việc HLR là mô hình **lồng nhau** trong DART là điểm mạnh lớn nhất của bài — nó cho phép một kiểm định thống kê sạch sẽ, chính xác thay vì so sánh hai mô hình rời rạc. Hãy nhấn mạnh điều này trong Method.
