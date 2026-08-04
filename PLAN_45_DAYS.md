# Kế hoạch 45 ngày — từ code hiện tại đến sẵn sàng chạy nghiên cứu chính

> Mục tiêu của 45 ngày này **không phải** là có kết quả để viết bài.
> Mục tiêu là: **hạ tầng chạy được, pilot xong, DART train được trên dữ liệu thật, IRB duyệt, pre-registration nộp, nghiên cứu chính khởi động ngày 45.**
>
> Nghiên cứu chính (8 tuần) chạy từ ngày 45 → 101. Nộp bài khoảng tháng thứ 6.
>
> Ai cố nén 8 tuần can thiệp vào trong 45 ngày sẽ có một bài báo không ai nhận.

**Quy ước:** mỗi ngày ≈ 4–6 giờ làm việc tập trung. 🔴 = đường găng, trễ là trễ cả dự án.

---

## TUẦN 1 — Chốt thiết kế, khởi động IRB, dựng môi trường

### Ngày 1 🔴 — Chốt thiết kế và nộp IRB

Đây là ngày quan trọng nhất trong 45 ngày. IRB mất 4–8 tuần chờ; nộp muộn 1 ngày là trễ cả dự án 1 ngày.

**Sáng — chốt bằng văn bản, không đổi nữa:**

| Hạng mục | Chốt |
|---|---|
| Số nhánh | 3: SM-2 (control), HLR (baseline), DART (đề xuất) |
| Cỡ mẫu | Tuyển 200, dự kiến phân tích ~165 (rơi rụng 18%) |
| Thời lượng | 8 tuần can thiệp + posttest trễ tuần 10 |
| Đối tượng | Học sinh THPT + sinh viên VN, CEFR A2–B2 |
| Biến phụ thuộc chính | Điểm recall posttest trễ (tuần 10) |
| Biến phụ thuộc phụ | ContextTransfer score, tỉ lệ tuân thủ |
| So sánh KARL/LECTOR/CARTS | Offline, replay trên log — không tốn người |

**Chiều — soạn và nộp hồ sơ IRB:**

- Đề cương nghiên cứu (3–5 trang)
- Phiếu thông tin cho người tham gia (tiếng Việt, đọc được ở trình độ THPT)
- Phiếu đồng ý tham gia + phiếu đồng ý của phụ huynh nếu có người dưới 18 tuổi
- Kế hoạch quản lý dữ liệu: lưu ở đâu, ai truy cập, ẩn danh thế nào, bao lâu thì xoá
- Đánh giá rủi ro: rủi ro tối thiểu, nhưng phải ghi rõ quyền rút lui bất cứ lúc nào

**Xong khi:** hồ sơ IRB đã nộp, có mã số theo dõi. Ghi ngày nộp vào file này.

---

### Ngày 2 — Dựng môi trường phân tích

```bash
cd D:\CODE\voichat1012
python -m venv .venv
.venv\Scripts\activate
pip install -r research\requirements.txt
python -c "import numpy, scipy, pandas, statsmodels; print('OK')"
```

Tạo `.env.research` (thêm vào `.gitignore` ngay):

```
MONGO_URI=mongodb+srv://...
RESEARCH_SALT=<32+ ký tự ngẫu nhiên>
```

Chạy thử toàn bộ pipeline bằng dữ liệu giả lập:

```bash
cd research
python synth_logs.py --learners 60 --weeks 8 --out data/synth.jsonl
python fit_dart.py --source jsonl --path data/synth.jsonl --boot 100
```

**Xong khi:** `fit_dart.py` chạy hết, in ra bảng reliability, ghi được `reports/rq1_report.json`.
Nhớ: **con số ở đây là giả, không phải kết quả.**

---

### Ngày 3 🔴 — Power analysis, chốt cỡ mẫu bằng số liệu

```bash
# A. Kiểm tra sai lầm loại I — bắt buộc trước khi pre-register
python power_analysis.py --grid 60,180 --alpha-true 0 --reps 200

# B. Đường cong power
python power_analysis.py --grid 30,60,90,120,180,240 --weeks 8 --reps 100
```

**Đọc kết quả:**
- Nếu tỷ lệ bác bỏ ở (A) > 0.10 → kiểm định sai, dừng lại sửa trước khi làm tiếp.
- Ở (B), lấy N nhỏ nhất đạt power ≥ 0.80. Nếu N đó > 200 → phải kéo dài thời gian
  can thiệp hoặc tăng số từ mỗi người học, chứ không tự an ủi.

**Xong khi:** có `reports/power.json` và một câu kết luận viết ra giấy dạng
"Với N = ___ học viên trong ___ tuần, power để phát hiện α = 0.45 là ___".
Câu này sẽ copy nguyên vào Method của bài báo.

---

### Ngày 4 — Dọn kho dữ liệu: mở rộng `ReviewLog`

Thêm các trường sau vào `app/models/ReviewLog.ts`:

```ts
clientEventId:    { type: String, required: true, unique: true },
sessionId:        { type: String, index: true },
condition:        { type: String, enum: ['sm2','hlr','dart','karl','lector','carts'] },
schedulerVersion: { type: String },   // 'dart@1.0.0'
weightsVersion:   { type: String },   // sha256 của dart_weights.json
scheduledAt:      { type: Date },
servedAt:         { type: Date },
elapsedMs:        { type: Number },   // performance.now() phía client
serverDeltaDays:  { type: Number },   // Δ do server tính, không tin client
taskPromptHash:   { type: String },
isCatchUp:        { type: Boolean, default: false },
```

Index cần thêm: `{ clientEventId: 1 }` unique, `{ condition: 1, createdAt: -1 }`.

**Xong khi:** insert thử 2 lần cùng `clientEventId` → lần 2 bị Mongo từ chối.

---

### Ngày 5 — Ba collection mới

`app/models/Participant.ts`:

```ts
userId, participantCode, condition, stratum,
cefrPretest, ageBand, educationLevel, school,
consentAt, enrolledAt, droppedAt, dropReason
```

`app/models/TestResult.ts`:

```ts
userId, phase: 'pretest'|'posttest_immediate'|'posttest_delayed',
recallScore, transferScore, productiveScore,
itemResponses: [{ word, correct, answer, elapsedMs }], takenAt
```

`app/models/JudgeScore.ts`:

```ts
reviewLogId, rater: 'llm'|'human1'|'human2',
accuracy, fluency, appropriateness, creativity, composite, model, ratedAt
```

**Xong khi:** 3 model tạo được document mẫu qua `ts-node` không lỗi.

---

### Ngày 6 🔴 — Tách DB nghiên cứu + backup tự động

- Tạo database riêng `voichat_research` (hoặc tối thiểu prefix `rs_` cho collection).
  Dữ liệu người dùng thường **không được** lẫn vào phân tích.
- Bật backup tự động hàng ngày. Trên Atlas M0 không có backup tự động → viết
  cron job `mongodump` chạy hằng đêm, đẩy lên R2 (bạn đã có `lib/r2-client.ts`).
- Test khôi phục **một lần ngay hôm nay**. Backup chưa từng restore thử là backup không tồn tại.

**Xong khi:** khôi phục thành công vào một DB tạm, đếm số document khớp.

---

### Ngày 7 — Kiểm kê và giảm nợ kỹ thuật

- Chạy `npx tsc --noEmit` — `next.config.js` đang bật `ignoreBuildErrors`, nên
  build xanh **không** có nghĩa là code đúng type.
- Chạy `npm test`, sửa test đỏ.
- Commit + push toàn bộ (đang còn 1 commit `801205f` chưa đẩy lên GitHub).

**Xong khi:** `tsc --noEmit` sạch trên các file thuộc phạm vi DART/CARTS, tests xanh, đã push.

---

## TUẦN 2 — Backend: một đường vào duy nhất, không mất log

### Ngày 8 🔴 — Hợp nhất endpoint review

Hiện có 3 đường chồng chéo: `/api/vocabulary-review`, `/api/dart/schedule`, `/api/carts/schedule`.
Ba đường ghi log ba kiểu → dữ liệu không so sánh được.

Tạo `POST /api/research/review`:

```
Input : { clientEventId, sessionId, vocabularyId, retrievalType,
          answer, elapsedMs, contextId }
Xử lý : xác thực → lấy Participant.condition → dispatch qua SchedulerRegistry
        → tính Δ bằng giờ server → ghi ReviewLog → trả về lịch tiếp theo
Output: { nextIntervalDays, nextRetrievalType, nextDueAt, correct }
```

Giữ nguyên các endpoint cũ cho người dùng thường; nhánh nghiên cứu **chỉ** đi qua đường mới.

**Xong khi:** curl 3 lần cùng `clientEventId` → đúng 1 dòng trong `reviewlogs`.

---

### Ngày 9 — Đóng băng phiên bản + thời gian phía server

- Sinh `weightsVersion` = sha256 của `dart_weights.json` lúc nạp, ghi vào mọi `ReviewLog`.
- `serverDeltaDays` tính từ `servedAt` phía server, không nhận từ client.
- Đánh dấu `isCatchUp = true` nếu học viên làm trễ hạn > 2× khoảng hẹn — những dòng này
  làm nhiễu ước lượng Δ và phải phân tích riêng.

**Xong khi:** query `db.reviewlogs.distinct('weightsVersion')` trả về đúng 1 giá trị.

---

### Ngày 10 — Endpoint enrol + assign

`POST /api/research/enrol`:
1. Ghi consent (timestamp, phiên bản phiếu)
2. Nhận điểm CEFR pretest → suy ra `stratum`
3. Gọi `assignCondition(userId, stratum)` → lưu vào `Participant`
4. Trả về `participantCode` (không lộ tên nhánh cho học viên)

**Lưu ý:** `lib/experimentAssignment.ts` đã được sửa từ 6 nhánh xuống 3 (`LIVE_ARMS`).
Kiểm tra `allocationSummary()` trên 200 id giả — nếu lệch quá ±35% thì chuyển sang
bảng block randomisation thay cho hash.

**Xong khi:** enrol 200 user giả, phân bổ 3 nhánh đều nhau chấp nhận được.

---

### Ngày 11 — LLM-Judge chuyển sang hàng đợi bất đồng bộ

Hiện `/api/context-transfer/judge` gọi LLM đồng bộ → sẽ timeout Vercel 10s khi
30 học viên nộp bài cùng lúc, và học viên bị treo màn hình.

- Đẩy vào `lib/queue.ts` có sẵn
- Học viên nhận phản hồi tức thì (đúng/sai + đáp án), điểm judge tính sau nền
- Ghi kết quả vào `JudgeScore`

**Xong khi:** submit 50 câu liên tiếp, không request nào > 2s, đủ 50 `JudgeScore` sau ≤ 5 phút.

---

### Ngày 12 — Cache task + chống hết quota

- Cache `(word, retrievalType, contextId)` → task đã sinh. Vừa tiết kiệm tiền vừa
  đảm bảo học viên cùng nhánh nhận task **tương đương** (tính hợp lệ nội bộ).
- Kiểm tra chuỗi fallback provider trong `lib/aiProvider.ts` thực sự hoạt động:
  tắt key Groq → phải tự chuyển sang OpenAI, không văng lỗi ra UI.
- Đặt ngân sách chi phí LLM/ngày + cảnh báo.

**Xong khi:** gọi 200 lần cùng bộ tham số → đúng 1 lần gọi LLM thật.

---

### Ngày 13 — Export + kiểm tra tính toàn vẹn dữ liệu

```bash
python research/export_logs.py --out research/data/export
```

Viết script `research/data_quality.py` kiểm tra:
- % dòng thiếu `elapsedMs`, `retrievalType`, `contextId`
- Phân bố `retrievalType` — **có đủ cả 4 mức không?**
- Số học viên có 0 lượt review (đăng ký nhưng không học)
- Δ âm hoặc Δ > 60 ngày (lỗi đồng hồ)

**Xong khi:** báo cáo chất lượng chạy được, tỷ lệ thiếu trường < 1%.

---

### Ngày 14 — Đệm + tổng kết tuần

Xử lý nợ tồn. Viết nhật ký tiến độ. Kiểm tra tình trạng IRB — nếu có yêu cầu bổ sung, trả lời ngay trong ngày.

---

## TUẦN 3 — Frontend: bốn định dạng truy hồi

> Đây là phần **chặn nghiên cứu**. Không có 4 định dạng task thì α không định danh được,
> và toàn bộ luận điểm DART sụp đổ. `dart-lab/page.tsx` hiện tại là công cụ debug, không dùng được cho học viên.

### Ngày 15 — Khung chung + đo thời gian chuẩn

`components/research/RetrievalTask.tsx`:

```ts
interface RetrievalTaskProps {
  task: { type: 0|1|2|3; word: string; prompt: string;
          options?: string[]; context: string };
  onSubmit: (answer: string, elapsedMs: number) => void;
}
```

Đo thời gian: `performance.now()` từ **sau khi render xong** (dùng `useLayoutEffect`)
đến lúc bấm nộp. Không tính thời gian tải mạng.

**Xong khi:** log `elapsedMs` khớp với bấm đồng hồ tay sai lệch < 100ms.

---

### Ngày 16 — d=0 (MCQ nhận diện) và d=1 (điền khuyết)

- `RecognitionMCQ`: 4 lựa chọn, xáo trộn thứ tự, có phím tắt 1–4
- `ClozeInput`: một ô trống trong câu, so khớp không phân biệt hoa thường, chấp nhận biến thể chính tả gần đúng

**Xong khi:** cả hai chạy được với dữ liệu mẫu, có trạng thái loading và trạng thái lỗi.

---

### Ngày 17 — d=2 (sinh có ràng buộc) và d=3 (diễn giải)

- `ConstrainedGen`: viết câu ≤ 20 từ chứa từ mục tiêu, đếm ký tự trực tiếp
- `ParaphraseTask`: diễn giải đoạn 2–3 câu

Hai loại này chấm bằng LLM-Judge (bất đồng bộ), nên UI phải hiển thị "đã ghi nhận"
ngay lập tức, đừng bắt học viên chờ điểm.

**Xong khi:** nộp bài → phản hồi tức thì, `JudgeScore` xuất hiện trong DB sau đó.

---

### Ngày 18 — Bộ chạy phiên học

`app/dashboard-new/study/page.tsx`:
1. Lấy danh sách từ đến hạn
2. Gọi `/api/research/review` để biết `retrievalType` kế tiếp
3. Render đúng component
4. Nộp → nhận lịch mới → từ tiếp theo
5. Lưu tạm vào IndexedDB nếu mất mạng, đồng bộ lại khi có mạng

**Xong khi:** chạy trọn 20 từ liên tiếp không lỗi, tắt mạng giữa chừng vẫn không mất câu trả lời.

---

### Ngày 19 🔴 — Làm mù điều kiện thí nghiệm

Nếu nhánh DART thấy 4 loại bài còn nhánh SM-2 chỉ thấy flashcard, học viên sẽ tự đoán ra
mình ở nhóm nào → thiên lệch kỳ vọng.

Cách xử lý:
- Bố cục, màu sắc, tiến trình, thông báo giống hệt nhau ở cả 3 nhánh
- Thông tin cho người tham gia nói: "hệ thống sẽ đưa nhiều dạng bài luyện tập khác nhau" —
  đúng với mọi nhánh, không tiết lộ nhánh nào có gì
- Không hiển thị tên scheduler ở bất kỳ đâu trong DOM, kể cả trong response JSON
- Ghi hạn chế còn lại vào mục Limitations: đây là mù một phía, không phải mù đôi

**Xong khi:** mở DevTools ở cả 3 tài khoản thuộc 3 nhánh — không phân biệt được nhánh nào.

---

### Ngày 20 — Bảng điều khiển nghiên cứu viên

`app/admin/research/page.tsx`: số người mỗi nhánh, tỷ lệ tuân thủ 7 ngày gần nhất,
danh sách người ≥ 5 ngày không hoạt động (để nhắc), tỷ lệ lỗi API, chi phí LLM.

**Xong khi:** nhìn một màn hình biết ngay ai sắp bỏ cuộc.

---

### Ngày 21 — Tổng kết tuần + kiểm tra chéo

Tự chạy thử vai trò học viên trong 30 phút liên tục. Ghi lại mọi chỗ khó chịu.
Nhờ 1 người ngoài dự án dùng thử và nghĩ thành tiếng.

---

## TUẦN 4 — Đo lường, học liệu, pre-registration

### Ngày 22 — Consent + pretest CEFR

- Màn hình thông tin + đồng ý (bản tiếng Việt, có phiên bản số)
- Pretest CEFR rút gọn: 30 câu, ~15 phút, phân tầng A2/B1/B2
- Bảng hỏi nhân khẩu: nhóm tuổi, trường, số năm học tiếng Anh, có đang học thêm không

**Xong khi:** người dùng đi từ đăng ký → consent → pretest → được phân nhánh, liền mạch.

---

### Ngày 23 🔴 — Soạn bộ từ mục tiêu

- 120–150 từ, chọn từ AWL/BNC theo tần suất, ngoài vốn A2 nhưng trong tầm B1–B2
- **Kiểm tra trước:** cho 20 người ngoài mẫu làm bài nhận biết. Loại các từ mà > 70% đã biết —
  từ mà ai cũng biết rồi thì không đo được sự học.
- Mỗi từ cần ≥ 6 ngữ cảnh khác nhau (cho context diversity), có embedding

**Xong khi:** `ContextItem` có đủ ≥ 6 mục cho mỗi từ, embedding sinh xong.

---

### Ngày 24 — Bộ đề posttest

Ba phần tách bạch — đây là điểm mạnh học thuật của bài:

| Phần | Đo cái gì | Dạng câu |
|---|---|---|
| Recall | Nhớ nghĩa | Dịch Anh→Việt, Việt→Anh |
| ContextTransfer | Chuyển giao ngữ cảnh | Dùng từ trong ngữ cảnh **chưa từng gặp** |
| Productive | Sản sinh | Viết đoạn ngắn dùng 5 từ mục tiêu |

Bắt buộc: ngữ cảnh trong posttest phải **khác hoàn toàn** ngữ cảnh lúc học. Nếu trùng thì
bạn đang đo trí nhớ vẹt chứ không phải transfer.

**Xong khi:** cùng một bộ đề dùng được cho cả 3 mốc (pretest / tuần 8 / tuần 10) với các phiên bản song song.

---

### Ngày 25 — Giao thức chấm của giám khảo người

Cần cho việc validate LLM-Judge (không có bước này thì ContextTransfer metric không được công nhận).

- Viết rubric 0–10 cho 4 chiều: accuracy, fluency, appropriateness, creativity
- Kèm 3 ví dụ mẫu mỗi mức điểm (neo điểm)
- Tuyển 2 giáo viên tiếng Anh, tập huấn trên 20 mẫu chung, thảo luận lệch điểm
- Chuẩn bị 200 mẫu để chấm mù (không biết nhánh, không biết điểm LLM)

**Xong khi:** 2 giám khảo chấm thử 20 mẫu đạt ICC > 0.70 sau tập huấn.

---

### Ngày 26 🔴 — Pre-registration

Đăng ký trên OSF (osf.io/registries) hoặc AsPredicted — miễn phí, làm trong 1 buổi,
và làm tăng đáng kể khả năng bài được nhận ở tạp chí Q1–Q2.

Nội dung bắt buộc khai báo **trước** khi thu dữ liệu:
- Giả thuyết: H₀: α = 0 vs H₁: α > 0; CARTS/DART > baseline về recall trễ
- Cỡ mẫu và power analysis (số ngày 3)
- Tiêu chí loại người tham gia (vd: < 10 phiên học thì loại)
- Mô hình phân tích chính: `recall ~ condition * week + cefr + (1|learner) + (1|word)`
- Hiệu chỉnh đa so sánh: Holm–Bonferroni
- Quy tắc dừng: không dừng sớm khi thấy p < .05

**Xong khi:** có link pre-registration công khai, dán vào bài báo sau này.

---

### Ngày 27 — Vận hành pilot

- Tuyển 15–20 người (không nằm trong mẫu chính)
- Kênh liên lạc (Zalo group), lịch nhắc học
- Script hướng dẫn buổi onboarding
- Biểu mẫu ghi sự cố

**Xong khi:** danh sách pilot đã xác nhận, buổi onboarding lên lịch cho ngày 29.

---

### Ngày 28 — Diễn tập toàn hệ thống

Chạy giả lập một ngày vận hành đầy đủ: 10 tài khoản test làm bài đồng thời.
Kiểm tra: có mất log không, có timeout không, chi phí LLM bao nhiêu, DB chịu được không.

**Xong khi:** 10 phiên đồng thời, 0 lỗi, log đủ 100%.

---

## TUẦN 5 — Pilot 2 tuần

### Ngày 29 — Onboarding pilot

Buổi trực tiếp hoặc online 45 phút. Consent, pretest, hướng dẫn dùng.
Nhấn mạnh quyền rút lui. Ghi nhận mọi câu hỏi họ đặt ra — đó là chỗ hướng dẫn của bạn chưa rõ.

### Ngày 30–34 — Pilot chạy, bạn quan sát

Mỗi ngày làm 3 việc:

1. **Sáng:** đọc dashboard, ghi lại ai không học, nhắn nhắc
2. **Trưa:** chạy `data_quality.py`, xem có trường nào bị thiếu
3. **Chiều:** sửa lỗi phát hiện được — nhưng **ghi lại mọi thay đổi kèm ngày giờ**,
   vì log trước và sau khi sửa có thể không so sánh được

Chỉ số cần theo dõi hằng ngày:

| Chỉ số | Ngưỡng báo động |
|---|---|
| Tỷ lệ hoàn thành phiên | < 70% |
| Thời gian trung bình mỗi phiên | > 20 phút (quá mệt → bỏ) |
| Tỷ lệ lỗi API | > 2% |
| Dòng log thiếu trường | > 1% |
| Phân bố retrievalType | Có mức nào < 5% tổng số |

### Ngày 35 — Phỏng vấn giữa pilot

Nói chuyện 15 phút với 5 người. Câu hỏi mở: chỗ nào khó chịu, chỗ nào không hiểu,
có đoán được mình ở nhóm nào không (kiểm tra làm mù có hiệu quả không).

---

## TUẦN 6 — Phân tích pilot, huấn luyện DART, validate LLM-Judge

### Ngày 36 — Kết thúc pilot, xuất dữ liệu

```bash
python research/export_logs.py --out research/data/pilot
python research/data_quality.py --path research/data/pilot
```

**Xong khi:** biết chính xác pilot cho bao nhiêu dòng dùng được (Δ > 0).

---

### Ngày 37 🔴 — Train DART lần đầu trên dữ liệu thật

```bash
cd research
python fit_dart.py --source jsonl --path data/pilot/reviews.jsonl \
    --boot 500 --out ../dart_weights.json --report reports/pilot_rq1.json
```

**Đọc theo thứ tự này, đừng đọc tắt:**

1. Dòng cảnh báo về `retrievalType` — nếu chỉ có 1 mức thì dừng, sửa frontend, làm lại
2. `alpha_hat` và khoảng tin cậy bootstrap
3. `alpha` theo từng fold — dao động lớn = chưa đủ dữ liệu, chuyện bình thường ở pilot
4. `DeLong p` ngoài mẫu — đây là con số thật sự quan trọng

**Điều phải chuẩn bị tinh thần:** khi chạy thử với 24 học viên/4 tuần trên dữ liệu mô phỏng,
LRT trong mẫu ra p = .019 nhưng DeLong ngoài mẫu ra p = .886 — nghĩa là mô hình
"có ý nghĩa thống kê" nhưng **không dự đoán tốt hơn chút nào**. Pilot của bạn nhiều khả năng
cũng vậy. Đó không phải thất bại, đó là lý do người ta làm pilot.

---

### Ngày 38 — Sửa vấn đề định danh α

Nếu (rất có thể) phân bố retrievalType lệch nặng — d=3 gần như không xuất hiện:

**Cách 1:** hạ ngưỡng trong `thresholds` để d cao xuất hiện sớm hơn.

**Cách 2 (tốt hơn về mặt thống kê):** thêm ε-exploration ~10% — với xác suất 10%,
chọn ngẫu nhiên `retrievalType` thay vì theo quy tắc ngưỡng.

Lý do cách 2 tốt hơn: khi d luôn được quyết định bởi h, thì d và h đồng biến hoàn toàn,
và α bị lẫn với θ. Chỉ có ngẫu nhiên hoá mới tách được hai thứ này. Đây chính là lập luận
identification mà reviewer sẽ hỏi — và bạn sẽ có câu trả lời sẵn.

Khai báo ε-exploration trong Method và trong bản pre-registration (cập nhật, ghi rõ ngày sửa).

**Xong khi:** mô phỏng lại cho thấy cả 4 mức d đều chiếm ≥ 10% số lượt.

---

### Ngày 39–40 🔴 — Validate LLM-Judge với giám khảo người

- 2 giám khảo chấm mù 200 mẫu theo rubric ngày 25
- Tính ICC(2,k) giữa người với người, và giữa trung bình-người với LLM
- Tính Krippendorff's α cho từng chiều trong 4 chiều

**Ngưỡng chấp nhận:**

| Chỉ số | Ngưỡng |
|---|---|
| ICC người–người | > 0.75 |
| ICC LLM–người | > 0.70 |
| Krippendorff's α mỗi chiều | > 0.67 |

Nếu không đạt: rubric chưa đủ rõ hoặc chiều "creativity" quá chủ quan (thường là chiều này).
Cân nhắc bỏ creativity, còn 3 chiều — và nói rõ lý do trong bài.

**Xong khi:** có bảng ICC để đưa thẳng vào Results mục 4.3.

---

### Ngày 41 — Cập nhật power analysis bằng tham số thật

Giờ bạn đã biết α thật cỡ nào, tỷ lệ review/người/tuần thật là bao nhiêu, dropout thật bao nhiêu.
Chạy lại power với các con số này:

```bash
python power_analysis.py --grid 120,180,240,300 --weeks 8 --reps 200 \
    --alpha-true <alpha ước lượng từ pilot>
```

**Đây là khoảnh khắc quyết định.** Nếu power < 0.80 ở N khả thi, bạn có 3 lựa chọn trung thực:

1. Tăng cỡ mẫu (tuyển thêm trường)
2. Kéo dài can thiệp (10–12 tuần thay vì 8)
3. Đổi khung bài báo: nhấn mạnh đóng góp hệ thống + metric, hạ RQ1 xuống là phân tích thăm dò

Lựa chọn tệ nhất là cứ chạy rồi hy vọng.

---

### Ngày 42 — Sửa hệ thống theo bài học pilot

Ưu tiên theo thứ tự: mất dữ liệu > gây bỏ cuộc > khó chịu nhỏ.
Đóng băng code sau ngày này. **Không sửa scheduler giữa chừng nghiên cứu chính.**

---

## TUẦN 7 — Quyết định và khởi động

### Ngày 43 🔴 — Go / No-Go

Chỉ chạy nghiên cứu chính khi **tất cả** điều kiện sau đạt:

- [ ] IRB đã duyệt (có văn bản)
- [ ] Pre-registration đã công khai
- [ ] Pilot cho tỷ lệ dữ liệu đủ chất lượng > 95%
- [ ] Cả 4 retrievalType đều xuất hiện ≥ 10%
- [ ] ICC LLM–người > 0.70
- [ ] Power ≥ 0.80 ở cỡ mẫu tuyển được
- [ ] Backup đã test khôi phục thành công
- [ ] Code đã đóng băng, có git tag

Nếu thiếu bất kỳ mục nào → hoãn, xử lý xong mới chạy. Chạy sớm 2 tuần để rồi
mất cả nghiên cứu là phép tính rất tệ.

---

### Ngày 44 — Tuyển người cho nghiên cứu chính

Mục tiêu 200 người. Liên hệ trường, buổi giới thiệu, consent, pretest CEFR.
Phân tầng theo CEFR rồi mới randomize.

**Xong khi:** ≥ 200 người đã consent + hoàn thành pretest.

---

### Ngày 45 — Khởi động + bắt đầu viết

**Sáng:** mở hệ thống cho nghiên cứu chính. Theo dõi sát 4 giờ đầu.

**Chiều:** bắt đầu viết bài. Không chờ kết quả — Introduction, Related Work và Method
viết được ngay bây giờ và chiếm ~60% số chữ của bài.

Tạo `paper/` với khung:

```
paper/
  01_introduction.md
  02_related_work.md
  03_method.md
  04_results.md      <- để trống, điền [TBD]
  05_discussion.md
  06_limitations.md
  refs.bib
```

**Quy tắc bất di bất dịch:** mọi con số trong bản thảo phải là `[TBD]` cho đến khi
có kết quả thật. Không viết trước rồi sửa sau — người ta quên sửa, và đó là cách
những bài báo bị rút lại ra đời.

---

## Sau ngày 45 — bản đồ đường đi

| Mốc | Ngày | Việc |
|---|---|---|
| Can thiệp 8 tuần | 45 → 101 | Vận hành + viết Intro/RelWork/Method song song |
| Kiểm tra giữa kỳ | 73 | Tuân thủ, dropout theo nhánh |
| Posttest tức thì | 101 | |
| Posttest trễ | 115 | **Số liệu quan trọng nhất** |
| Phân tích | 116 → 130 | Mixed models, ablation offline, effect size |
| Viết Results/Discussion | 131 → 145 | |
| Hình + bảng | 146 → 152 | |
| Hiệu đính tiếng Anh | 153 → 160 | Thuê chuyên nghiệp |
| **Nộp bài** | **~165** | |

---

## Lịch chạy lệnh nhanh

```bash
# Dựng môi trường (ngày 2)
python -m venv .venv && .venv\Scripts\activate
pip install -r research\requirements.txt

# Chạy thử pipeline (ngày 2)
cd research
python synth_logs.py --learners 60 --weeks 8 --out data/synth.jsonl
python fit_dart.py --source jsonl --path data/synth.jsonl --boot 100

# Power + Type-I (ngày 3)
python power_analysis.py --grid 60,180 --alpha-true 0 --reps 200
python power_analysis.py --grid 30,60,90,120,180,240 --reps 100

# Sau pilot (ngày 36-37)
python export_logs.py --out data/pilot
python fit_dart.py --source jsonl --path data/pilot/reviews.jsonl \
    --boot 500 --out ../dart_weights.json --report reports/pilot_rq1.json

# Kiểm tra code
npx tsc --noEmit
npm test
```
