# `research/` — Sổ tay vận hành phân tích DART

Thư mục này tách hoàn toàn khỏi `python-api/` (vốn cố tình giữ nhẹ để deploy Railway).
Đây là môi trường phân tích chạy trên máy bạn.

---

## 1. Cài môi trường (làm một lần)

```bash
cd D:\CODE\voichat1012
python -m venv .venv
.venv\Scripts\activate
pip install -r research\requirements.txt
```

Kiểm tra:

```bash
python -c "import numpy, scipy, pandas, statsmodels; print('OK')"
```

Biến môi trường cần có (đặt trong `.env.research`, **đừng commit**):

```
MONGO_URI=mongodb+srv://...
RESEARCH_SALT=<chuỗi ngẫu nhiên dài, giữ bí mật>
```

---

## 2. Các file và vai trò

| File | Vai trò |
|---|---|
| `dart_model.py` | Toàn bộ phần toán: half-life, NLL + gradient, L-BFGS fit, AUC, Brier, ECE, DeLong, LRT |
| `synth_logs.py` | Sinh log giả lập — **chỉ để chạy thử pipeline và tính power** |
| `fit_dart.py` | Script trả lời RQ1: fit DART vs HLR, LRT, bootstrap CI, CV theo học viên |
| `power_analysis.py` | Tính cỡ mẫu cần thiết + kiểm tra sai lầm loại I |
| `export_logs.py` | Xuất dữ liệu từ Mongo, ẩn danh hoá |

---

## 3. Quy trình chuẩn

### Bước 1 — Chạy thử toàn bộ pipeline khi chưa có học viên nào

```bash
cd research
python synth_logs.py --learners 60 --weeks 8 --out data/synth.jsonl
python fit_dart.py --source jsonl --path data/synth.jsonl --boot 100
```

Mục tiêu: mọi thứ chạy trơn, không lỗi. **Không đọc con số như một kết quả.**

### Bước 2 — Kiểm tra sai lầm loại I (bắt buộc trước khi pre-register)

```bash
python power_analysis.py --grid 60,180 --alpha-true 0 --reps 200
```

Tỷ lệ bác bỏ phải quanh 0.05. Nếu > 0.10 → kiểm định bị sai, dừng lại sửa.

### Bước 3 — Tính power, chốt cỡ mẫu

```bash
python power_analysis.py --grid 30,60,90,120,180,240 --weeks 8 --reps 100
```

Lấy N nhỏ nhất đạt power ≥ 0.80. Ghi số này vào bản pre-registration.

### Bước 4 — Sau khi thu dữ liệu thật

```bash
python export_logs.py --out data/export
python fit_dart.py --source jsonl --path data/export/reviews.jsonl \
    --boot 1000 --out ../dart_weights.json --report reports/rq1_final.json
```

`dart_weights.json` ở thư mục gốc sẽ được `lib/dartWeights.ts` tự nạp (hot-reload theo mtime).

---

## 4. Ba cạm bẫy đã được xử lý sẵn trong code

**Rò rỉ dữ liệu khi chia CV.** `fit_dart.py` chia fold theo `userId`, không theo dòng.
Chia theo dòng khiến lịch sử của chính học viên đó lọt vào tập test → AUC ảo cao.
Reviewer của tạp chí công nghệ giáo dục kiểm tra điểm này thường xuyên.

**p-value ở biên tham số.** Vì ràng buộc α ≥ 0, dưới H₀ tham số nằm đúng ở biên
miền xác định. Phân phối tiệm cận là hỗn hợp 50:50 của χ²(0) và χ²(1), nên
p đúng = ½ × p(χ²₁). Code báo cả hai; **trình bày con số boundary-corrected**
và trích Self & Liang (1987).

**Bootstrap phải theo cụm.** `cluster_bootstrap_alpha()` lấy mẫu lại **học viên**,
không phải dòng. Bootstrap theo dòng bỏ qua tương quan trong cùng một người và
cho khoảng tin cậy hẹp giả tạo.

---

## 5. Cạm bẫy CHƯA xử lý — bạn phải tự canh

**α không định danh được nếu chỉ phục vụ một loại retrieval.**
Nếu frontend chỉ hiển thị MCQ thì mọi `retrievalType = 0`, số hạng `exp(α·φ(d))`
trở thành hằng số và bị hấp thụ vào bias. `fit_dart.py` sẽ in cảnh báo, nhưng
vẫn chạy — đừng bỏ qua dòng cảnh báo đó.

**Phân bố retrieval type bị lệch nặng.** Chạy thử cho thấy quy tắc ngưỡng
`{low:2, mid:7, high:30}` gần như không bao giờ chạm d=3 (paraphrase), và d=2
chỉ chiếm ~2% số lượt. Muốn ước lượng α ổn định cần đủ số quan sát ở **cả bốn**
mức. Hai cách xử lý:

1. Hạ ngưỡng để d cao xuất hiện sớm hơn, hoặc
2. Thêm nhiễu ngẫu nhiên có kiểm soát (ε-exploration ~10%) vào việc chọn d,
   khai báo rõ trong Method. Cách này chuẩn hơn về mặt thống kê vì phá được
   sự đồng biến giữa d và half-life.

Không có bước này, α sẽ được ước lượng gần như chỉ từ tương phản d=0 vs d=1.

---

## 6. Đọc kết quả `fit_dart.py` thế nào

| Dòng in ra | Ý nghĩa | Ngưỡng đáng lo |
|---|---|---|
| `alpha_hat` | Độ mạnh điều biến của độ khó | Sát 0 → DART ≡ HLR |
| `p (boundary-correct)` | Kiểm định chính của RQ1 | > .05 → không kết luận được |
| `alpha 95% CI` | Bootstrap theo cụm | Chạm 0 → không claim được |
| `share of boots at 0` | Tỷ lệ lần bootstrap α bị đẩy về biên | > .2 → ước lượng bất ổn |
| Fold-level `alpha` | Độ ổn định giữa các fold | Dao động lớn (vd .17 → .80) → thiếu dữ liệu |
| `DeLong p` | AUC ngoài mẫu có khác không | Đây mới là bằng chứng thuyết phục nhất |
| `ECE` | Sai số hiệu chỉnh xác suất | > .05 → xác suất không đáng tin |

**Cảnh báo từ lần chạy thử thật:** với 24 học viên / 4 tuần, LRT trong mẫu ra
p = .019 (có ý nghĩa) nhưng DeLong ngoài mẫu ra p = .886 (không khác gì HLR),
và α theo từng fold nhảy từ 0.17 đến 0.80. Đây chính là bức tranh của một
nghiên cứu **thiếu power**: kiểm định trong mẫu bắt được nhiễu, còn dự đoán
ngoài mẫu thì không cải thiện gì. Đừng nộp bài trong tình trạng đó — chạy
`power_analysis.py` trước và tuyển đủ người.
