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
  Nếu không, dùng ε-exploration 10% (khai báo trong Method)
- **Xử lý dropout:** ITT chính + PP nhạy cảm. Định nghĩa dropout = < 60% phiên
- **α biên:** báo cả p_boundary (Self & Liang 1987) và p naïve
- **Ngưỡng power:** N nhỏ nhất đạt power ≥ .80 cho α = 0.45 (chốt ở Ngày 3)

## 4. Ràng buộc phi ngoại lai (không được đổi giữa chừng)

- Không thêm/bớt nhánh sau khi bắt đầu tuyển
- Không đổi biến phụ thuộc chính
- Không đổi ngưỡng α (0.05)
- Không đổi định nghĩa recall (correct on first attempt, no hint)
- Bộ từ mục tiêu và posttest **khoá trước khi tuyển pilot** (Ngày 23–24)

## 5. Điều kiện đạo đức

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
