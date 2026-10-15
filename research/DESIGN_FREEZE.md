# Chốt thiết kế nghiên cứu — DART cho SRS L2

> Điền, ký, lưu bản PDF vào hồ sơ nghiên cứu. **Không sửa các mục đã ký nữa**
> — nếu bắt buộc phải sửa, tạo bản amendment mới, ghi lý do và ngày sửa.

---

## Thông tin chung

| Mục | Giá trị |
|---|---|
| Tên nghiên cứu | So sánh hiệu quả của DART (Difficulty-Adaptive Retrieval Timing) với SM-2 và HLR trên học từ vựng tiếng Anh của người Việt |
| Nghiên cứu viên chính | Phan Văn Kha |
| Người hướng dẫn | ______________________________ |
| Đơn vị chủ trì | ______________________________ |
| Ngày chốt thiết kế | ______________________________ |
| Chữ ký NCV | ______________________________ |
| Chữ ký hướng dẫn | ______________________________ |

---

## 1. Thiết kế thực nghiệm (đã chốt)

| Hạng mục | Giá trị chốt |
|---|---|
| Kiểu nghiên cứu | RCT giữa các nhóm, mù đơn (participant-blind) |
| Số nhánh | 3: **SM-2** (control) · **HLR** (baseline) · **DART** (đề xuất) |
| Tỷ lệ phân bổ | 1:1:1, phân tầng theo CEFR (A2/B1/B2) |
| Cỡ mẫu tuyển | **200** (dự kiến phân tích ~165, rơi rụng 18%) |
| Thời lượng can thiệp | **8 tuần** |
| Posttest trễ | **Tuần 10** (sau kết thúc can thiệp 2 tuần) |
| Đối tượng | Học sinh THPT + sinh viên VN, CEFR A2–B2 |
| Loại trừ | Đã học tiếng Anh chuyên ngành trên B2; rối loạn ngôn ngữ/thị giác chưa hiệu chỉnh |
| Biến phụ thuộc chính | **Điểm recall posttest trễ tuần 10** (0–100) |
| Biến phụ thuộc phụ | ContextTransfer score · Tỷ lệ tuân thủ · Retention curve |
| So sánh với KARL/LECTOR/CARTS | **Offline**, replay trên log — không tốn người |

## 2. Câu hỏi nghiên cứu và giả thuyết

**RQ1** — DART có dự đoán xác suất nhớ chính xác hơn HLR trên dữ liệu thật không?
- H₀: α = 0 (DART thoái hoá về HLR)
- H₁: α > 0
- Kiểm định: LRT boundary-corrected + DeLong ngoài mẫu (bằng chứng chính)
- Ngưỡng: p_boundary < .05 **và** DeLong p < .05

**RQ2** — Nhánh DART có cho điểm posttest trễ cao hơn SM-2/HLR không?
- H₀: μ_DART = μ_HLR = μ_SM2
- H₁: μ_DART > max(μ_HLR, μ_SM2)
- Kiểm định: mixed-effects ANCOVA (điều chỉnh pretest, CEFR)
- Điều chỉnh đa so sánh: Holm–Bonferroni

**RQ3** — Có cải thiện ContextTransfer (đo bằng LLM-Judge, hiệu chỉnh với người)?
- ICC(LLM, người) ≥ .70 trước khi dùng LLM-Judge làm outcome

## 3. Kế hoạch phân tích (khoá trước khi thu dữ liệu)

- **Đơn vị bootstrap:** cụm theo `userId`, không theo dòng
- **Chia CV:** 5-fold theo `userId` — bắt buộc, không được chia theo dòng
- **Phân bố retrievalType:** mỗi mức d ∈ {0,1,2,3} phải ≥ 10% tổng lượt.
  Nếu không, dùng ε-exploration 20% (Decision D-014, 2026-08-11; khai báo trong Method)
- **Xử lý dropout:** ITT chính + PP nhạy cảm. Định nghĩa dropout = < 60% phiên
- **α biên:** báo cả p_boundary (Self & Liang 1987) và p naïve
- **Ngưỡng power:** N nhỏ nhất đạt power ≥ .80 cho α = 0.45 (chốt ở Ngày 3)

## 4. Ràng buộc phi ngoại lai (không được đổi giữa chừng)

- Không thêm/bớt nhánh sau khi bắt đầu tuyển
- Không đổi biến phụ thuộc chính
- Không đổi ngưỡng α (0.05)
- Không đổi định nghĩa recall (correct on first attempt, no hint)
- Bộ từ mục tiêu và posttest **khoá trước khi tuyển pilot** (Ngày 23–24)

## 5. Hằng số đã khoá trong code (pre-registered constants)

Tất cả hằng số dưới đây **không được sửa sau khi thu dữ liệu bắt đầu**. Mỗi hằng số có vị trí trong code kèm theo.

| Hằng số | Giá trị | File | Mô tả |
|---|---|---|---|
| `PARAPHRASE_OVERLAP_MAX` | `0.70` | `lib/retrievalTasks/paraphrase.ts` | Jaccard similarity tối đa cho câu trả lời Paraphrase — vượt ngưỡng = copy |
| Levenshtein typo tolerance | 1 edit, chỉ word ≥ 5 chars | `lib/retrievalTasks/cloze.ts` | Typo tolerance cho Cloze scoring |
| `MIN_PLAUSIBLE_ELAPSED_MS` | `200` | `lib/retrievalTasks/timing.ts` | Dưới ngưỡng = mash button → raw log nhưng flag |
| `MAX_PLAUSIBLE_ELAPSED_MS` | `300000` (5 phút) | `lib/retrievalTasks/timing.ts` | Trên ngưỡng = AFK → clamp cho phân tích |
| `TOKEN_TTL_SECS` | `6048000` (70 ngày) | `lib/participantAuth.ts` | TTL cho participant token |
| `FORM_VERSION` | `"posttest_v1.0"` | `lib/posttestBuilder.ts` | Bộ đề posttest — khoá trước pilot |
| ε-exploration rate | `0.20` | `lib/retrievalTasks/session.ts` | 20% random task-type để đảm bảo identifiability α (Decision D-014, 2026-08-11) |
| retrievalType threshold | 10% mỗi mức | `research/dq_check.py` check 2 | Cảnh báo α mất định danh nếu bất kỳ d nào < 10% |
| ICC threshold | `≥ 0.70` | `research/CALIBRATION_GUIDE.md` | LLM Judge vs human — điều kiện để dùng LLM làm primary scorer |
| Rubric max (4-dim) | 8 | `lib/judgeRubric.ts` | form+meaning+use+contextFit, mỗi chiều 0-2 |
| Recall item set | w_001–010 + w_031–040 | `lib/posttestBuilder.ts` | Cố định, không shuffle theo participant |
| Cloze item set | w_011–020 + w_041–050 (sentences[1]) | `lib/posttestBuilder.ts` | Dùng sentences[1] — khác câu training |
| Context transfer items | w_021–025 + w_051–055 | `lib/posttestBuilder.ts` | 10 scenario mới hoàn toàn |
| Delayed posttest words | w_026–030 + w_056–060 | `lib/posttestBuilder.ts` | Chỉ xuất hiện ở tuần 10 |
| Target word bank | 60 từ (B1: w_001–030, B2: w_031–060) | `lib/wordBank.ts` | Khoá trước pilot. Chỉ được loại sau H5 pilot testing có lý do |

**Cách ghi nhận sửa đổi**: Nếu bắt buộc phải sửa bất kỳ hằng số nào sau khi tuyển pilot, tạo file `research/AMENDMENTS.md` ghi rõ: (1) hằng số, (2) giá trị cũ → mới, (3) lý do, (4) ngày, (5) chữ ký NCV + hướng dẫn.

## 6. Điều kiện đạo đức

- Tham gia hoàn toàn tự nguyện, có quyền rút lui bất cứ lúc nào không cần lý do
- Dữ liệu ẩn danh, ID băm HMAC-SHA256 với `RESEARCH_SALT`
- Người < 18 tuổi: cần đồng ý phụ huynh
- Không thu thập PII ngoài email liên lạc (xoá sau nghiên cứu)
- Người tham gia được nhận báo cáo tổng hợp sau khi phân tích xong

---

## Chữ ký

**Nghiên cứu viên chính** — Phan Văn Kha
Ngày: ______________________________
Chữ ký: ______________________________

**Người hướng dẫn**
Họ tên: ______________________________
Ngày: ______________________________
Chữ ký: ______________________________

