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
