# Amendments to Pre-Registration

> File này ghi nhận mọi sửa đổi so với `PREREGISTRATION.md` sau khi hồ sơ đã được nộp/khoá.
> Mỗi mục phải có: (1) hằng số/thủ tục bị sửa, (2) giá trị cũ → mới, (3) lý do, (4) ngày, (5) chữ ký NCV + hướng dẫn.
> Sửa đổi phải được thực hiện **TRƯỚC** khi thấy dữ liệu pilot; nếu sau, phải ghi rõ và giải trình.

---

## Amendment #A-001 — Cluster-adjusted LRT for α

**Trạng thái:** ✅ Đã ký 2026-08-07. Chọn **Phương án A** (Cluster-bootstrap LRT). Ký trước khi bắt đầu pilot (Ngày 27) và trước khi thấy pilot data.

**Bối cảnh:**
Type-I diagnostic 2026-08-05 và 2026-08-06 (`research/reports/TYPE1_DIAGNOSTIC_2026-08-06.md`) xác nhận
`lrt_alpha` boundary-corrected χ²₁ bị **anti-conservative** ở tham số study (weeks=8, N=60):
reject rate = 0.146 (Wilson 95% CI [0.092, 0.223], 110 reps mô phỏng) — CI floor **> 0.05 nominal**.
Bootstrap null-distribution study cho thấy right tail dày **2.8×–3.7×** χ²₁ (30 boot pooled) → nguyên nhân là
clustering theo `userId` mà LRT asymptotic không tính đến.

Pre-registration hiện tại (`PREREGISTRATION.md`, RQ1) đăng ký kiểm định LRT boundary-corrected + DeLong ngoài mẫu.
Nếu để nguyên, Type-I inflation sẽ đưa mọi kết quả "significant" của RQ1 vào diện artefact.

**Phương án đề xuất — chọn A HOẶC B:**

### Phương án A — Cluster-bootstrap LRT (an toàn nhất, ưu tiên)

- Thay `lrt_alpha` chuẩn bằng cluster-bootstrap: resample với thay thế **theo `userId`** (không phải theo dòng),
  B=1000 lần, so LR quan sát với phân phối null bootstrap.
- Ưu điểm: robust với mọi mức clustering; không giả định phân phối null cụ thể.
- Nhược điểm: ~1000× chi phí compute; cần chạy trước khi peer review (không phải mỗi lần fit).
- Prototype: `research/cluster_bootstrap_lrt_prototype.py` (đã có, single-replicate).
- Chi phí implement: agent hoàn thành trong 1 ngày sau khi ký.
- Chi phí compute: ước tính 6–12 giờ CPU cho analysis cuối cùng.

### Phương án B — Cluster-robust sandwich adjustment (Rogers 1993 / Cameron-Miller 2015)

- Điều chỉnh variance-covariance của MLE bằng cluster-robust "sandwich" estimator; scale LR bằng
  hệ số hiệu chỉnh cụm.
- Ưu điểm: fast (constant overhead); không cần bootstrap.
- Nhược điểm: cần derive analytical Jacobian cho DART loss; giả định cluster count đủ lớn (60 học viên là biên).
- Chi phí implement: agent cần 2–3 ngày (Jacobian + test regression).

**Ghi chú viết bài:**
Cả hai đều phải được ghi trong Method section như "corrected LRT for clustering as per pre-registration amendment
#A-001 dated YYYY-MM-DD, before pilot data collection". Reviewer chuyên sâu có thể chất vấn cluster count 60 —
nếu chọn B, chuẩn bị sensitivity phân tích với cluster-bootstrap để backup.

---

**Chữ ký & quyết định:**

Chọn phương án: ✅ **A** (Cluster-bootstrap LRT)   ⬜ B

Nghiên cứu viên chính — Phan Văn Kha
Ngày: 2026-08-07
Chữ ký: [đã ký điện tử qua confirmation trong RESEARCH_PROGRESS.md Ngày 4]

Người hướng dẫn
Họ tên: ______________________________
Ngày: ______________________________
Chữ ký: ______________________________

---

<!-- Add new amendments below this line, most recent on top -->

## Amendment #A-002 — Judge composite as DART feature (exploratory, sensitivity)

**Trạng thái:** ✅ **Đã ký 2026-08-09** — NCV chính xác nhận qua chat sau khi xem simulation oscillation (CV +11.1% PASS) và mitigation theta[5] init 0.2. Ký trước pilot Ngày 27 và trước khi thấy pilot data. **Bắt buộc ký trước khi mở pilot (Ngày 27)** vì thay đổi feature encoding. Nếu ký sau khi thấy dữ liệu pilot, phải giải trình rõ.

**Bối cảnh:**
Feature encoding hiện tại của DART (Methods §3.2, `lib/dart.ts` `buildFeatureVector`) gồm 5 thành phần:
`x = [1, cefr, wordFreqLog, userAvgAcc, timesReviewedLog]` (bias + 4 feature). Tất cả đều "shallow" — không có feature nào phản ánh **chất lượng sản sinh** (productive quality) của lần retrieval trước. Levels-of-processing theory (Craik & Lockhart 1972; Fisher & Craik 1977) dự báo depth of encoding là predictor mạnh của long-term retention. LLM-Judge (Sec 2.5) chấm 4 chiều 0–10 (accuracy, fluency, appropriateness, creativity) và trả về `composite` — chính là proxy cho depth of processing của lần constrained-gen / paraphrase (d=2, d=3).

**Đề xuất:**
Thêm feature thứ 6 `recentJudgeComposite ∈ [0, 1]` = `judge.composite / 10` của **lần retrieval judge-scored gần nhất** cho cùng cặp (userId, vocabularyId). Nếu chưa có (d=0/d=1 không được judge, hoặc HV chưa từng làm bài productive) → **default 0.5** (neutral prior, không phạt cũng không thưởng).

`buildFeatureVector` → trả 6 phần tử; `theta` mở rộng 6 phần tử (thêm `theta[5]`). Giá trị khởi tạo `theta[5] = 0.4` (dương vừa phải; huấn luyện thật sẽ estimate lại trong `train_dart.py` Ngày 37). `α` không thay đổi ý nghĩa — vẫn là hệ số của `φ(d)`.

**Ba câu hỏi khoa học phải trả lời trong bài:**

1. **Rủi ro confound với α:** judge composite có thể tương quan âm với retrievalType (bài khó thường điểm judge thấp hơn). Nếu thêm x[5] hút mất variance từ α → mất khả năng chứng minh RQ1. **Mitigation:** report ablation Table 3 với 3 mô hình:
   - M1: baseline HLR (không có α, không có x[5])
   - M2: DART (có α, không có x[5]) — **primary** cho RQ1 (giữ nguyên preregistration)
   - M3: DART + judge (có α, có x[5]) — **sensitivity**, exploratory
   Nếu α trong M3 không còn có ý nghĩa nhưng α trong M2 có → discuss confound, không tuyên bố M3 là mô hình chính.

2. **Missing data mechanism:** default 0.5 khi không có judge → tạo mass point tại 0.5 trong distribution. Có nguy cơ bias theta[5] về 0 (vì đa số row là 0.5). Sensitivity phân tích thứ 2: fit lại M3 chỉ trên subset row có judge thực (d=2, d=3) → theta[5] trên subset này mới là ước lượng "sạch".

3. **Vòng lặp nội tại (feedback loop):** judge composite cao → half-life dài → ôn muộn → khi ôn lại có thể quên → judge thấp. Có thể tạo dao động. **Mitigation:** simulation với `synth_logs.py` trước pilot: chèn feature x[5] với `alpha_true = 0`, `theta[5]_true = 0.4`, xem có tạo oscillation không. **Chưa chạy — đặt điều kiện ký amendment này**.

**Thay đổi trong PREREGISTRATION.md phải cập nhật kèm:**
- §3.2 Feature encoding: thêm x[5] vào bảng.
- §5 RQ list: thêm RQ4 (post-hoc / exploratory): "Does recent productive-quality (judge composite) predict future retention beyond shallow features?"
- §7 Analysis plan: khai báo M2 vẫn là primary cho RQ1; M3 là secondary/sensitivity; ablation Table 3 bắt buộc report.
- §8 Threats to validity: thêm mục α-confound risk.

**Chi phí implement:** agent hoàn thành trong 1 ngày (đã bắt đầu 2026-08-09):
- `lib/dart.ts` — buildFeatureVector accept optional `recentJudgeComposite`; DEFAULT_DART_WEIGHTS.theta mở rộng lên 6 dim; featureNames thêm mục.
- `app/models/ReviewLog.ts` — thêm top-level field `judgeComposite?: number` (mirror `judge.composite / 10`) cho query nhanh.
- `lib/judgeQueue.ts` worker + `/api/context-transfer/judge/status` — sau khi mirror `judge.composite`, cũng ghi `judgeComposite`.
- `app/api/dart/schedule` — trước khi build feature, query ReviewLog gần nhất có `judgeComposite`, đưa vào.
- Tests: `__tests__/dart.test.ts` cập nhật 6-dim, thêm test cho recentJudgeComposite.

**Chi phí compute:** không đổi (O(1) thêm 1 lookup index-backed).

**Đã chạy simulation oscillation (2026-08-09):**
- Script: `research/simulate_judge_feedback.py` (200 HV × 60 từ × 20 lần ôn, ALPHA_TRUE=0 worst case).
- Output: `research/reports/JUDGE_FEEDBACK_SIMULATION_2026-08-09.txt`.
- **Kết quả: ❌ FAIL** — CV(intervals) tăng **+26.6%** so với baseline (ngưỡng < +20%). Judge feature với theta[5]=0.4 init tạo oscillation quá mức.
- **Ba mitigation đề xuất, xếp theo mức dễ:**
  1. **Giảm theta[5] init** từ 0.4 → 0.2 (giảm biên độ), rồi rerun simulation.
  2. **Cap composite range**: dùng `clip(judgeComposite, 0.3, 0.7)` thay vì [0, 1] để giảm outlier.
  3. **EMA dampening**: `recentJudge_smoothed = 0.5 * prev + 0.5 * current` (hoặc chỉ dùng median 3 lần chấm gần nhất).
- **Khuyến nghị:** thử (1) trước; nếu vẫn fail, kết hợp (1)+(3). Không ký A-002 cho tới khi CV Δ < +20%.
- **Update 2026-08-09 chiều:** đã áp mitigation (1) — theta[5] init 0.4 → 0.2 trong `lib/dart.ts` và demo `app/dashboard-new/dart-lab/page.tsx`. Rerun simulation: **CV Δ = +11.1% ✅ PASS**. Interval trung bình +13.6% so với baseline (chấp nhận được — nghĩa là dùng judge feature giãn khoảng ôn nhẹ khi HV làm tốt). Sẵn sàng để ký amendment.

**Chưa quyết định (để bạn ký):**
- ⬜ Có amend PREREGISTRATION §5 thêm RQ4 không? (Khuyến nghị: **có**, nếu không thì M3 không được report trong paper.)

**Chữ ký & quyết định:**

Chọn: ✅ Thêm x[5] recentJudgeComposite (secondary/sensitivity, M3 không phải primary)  ⬜ Bỏ

Nghiên cứu viên chính — Phan Văn Kha
Ngày: 2026-08-09
Chữ ký: [ký điện tử qua chat confirmation, sau khi xem oscillation simulation PASS]

Người hướng dẫn
Họ tên: ______________________________
Ngày: ______________________________
Chữ ký: ______________________________
(Cần chữ ký người hướng dẫn trước Ngày 27 để hoàn tất amendment)

---
