# Decisions Log (ADR-lite)

> Nhật ký các **quyết định thiết kế / hướng đi** đã chốt — không phải log việc hằng ngày (cái đó ở `RESEARCH_PROGRESS.md`) và không phải log tính năng đã ship (cái đó ở `IMPLEMENTATION.md`).
>
> **Mục đích:** giữ ký ức bền giữa các phiên chat. Mỗi lần bạn chốt gì đó với agent, agent tự chèn 1 mục ở đầu file (mục mới nhất trên cùng).
>
> **Cách agent tự cập nhật:** khi bạn nói các cụm như *"chốt", "quyết định", "từ nay dùng X", "đổi hướng sang Y", "không dùng Z nữa", "góp ý UI: …"* — agent chèn 1 mục mới. Nếu quyết định thay thế một mục cũ, agent đánh dấu mục cũ **⛔ Superseded by D-XXX**.

**Cách đọc:**
- `D-###` — ID quyết định (tăng dần, không tái sử dụng).
- **Trạng thái:** ✅ Active · ⛔ Superseded · 🟡 Provisional (chờ dữ liệu thật xác nhận) · ❌ Reverted.
- **Ngữ cảnh** = tại sao lại có lựa chọn này. **Quyết định** = chọn gì. **Hệ quả** = kéo theo gì.

---

<!-- DECISION_INSERT_POINT -->

## D-007 · DART/CARTS Lab UI — bổ sung side-help panel + tooltip/hover động
**Ngày:** 2026-08-09 · **Trạng thái:** 🟡 Provisional (chờ triển khai + user test) · **Liên quan:** `app/dashboard-new/dart-lab/page.tsx`, `docs/UI_UX.md`

**Ngữ cảnh:** User (2026-08-09) phản hồi rằng ngay cả sau redesign 4-tab với preset và hint, giao diện DART/CARTS Lab vẫn khó hiểu với người không phải dev. Screenshot lúc phản hồi thực ra là **build cũ chưa redesign** (english, dev-tool style), nhưng ý phản hồi vẫn hợp lệ cho phiên bản mới: hint hiện tại là *dưới field*, khi user scroll xa khỏi field thì mất context; kết quả trả về không có giải thích ngữ nghĩa; jargon (α, θ, half-life, retrieval difficulty) vẫn dày đặc trên trang overview.

**Quyết định:** Bổ sung hai lớp help lên `dart-lab/page.tsx`:
1. **Side-help panel dính (sticky) bên phải** — ở tab "Thử lịch học" và "Chấm câu", show 1 khối 240–280px giải thích *chính khái niệm đang thao tác*, cập nhật khi user focus vào field khác. Ví dụ focus "quality (0–5)" → panel hiện: "Điểm này là cảm nhận nhớ, không phải điểm đúng/sai. 5 = trả lời gần như tự động; 3 = nhớ ra sau vài giây; 0 = quên hẳn." Trên mobile → thay bằng bottom-sheet trượt.
2. **Pivot động (contextual explanation) sau khi có kết quả** — thay vì chỉ hiện "3.5 ngày" và "d=1 Cloze", hiện thêm 1 dòng "**Nghĩa là:** hệ thống dự đoán bạn nhớ ~50% từ này sau 3.5 ngày; bài kế tiếp là điền chỗ trống — khó hơn MCQ một bậc." Câu này template hoá theo `halfLife` và `nextRetrievalType`, không cần LLM.

**Hệ quả:**
- Tạo component `<HelpPanel>` reuse được (props: `activeField`, `content`) trong `app/dashboard-new/dart-lab/page.tsx` — không tách file mới trừ khi >2 trang dùng.
- Grid layout tab "schedule" và "judge" đổi từ single-column → 2-col (2/3 form + 1/3 help) trên `md:` breakpoint.
- Thêm entry trong `docs/UI_UX.md` mô tả nguyên tắc "help stays where the field is looked at" cho các trang lab khác trong tương lai (assessment, familiarity screening).
- Chưa quyết định: có làm hover tooltip trên header α/θ hay không — chờ test với 3 người thử ("hallway usability").

**Trước khi triển khai:** yêu cầu user restart dev server + hard-reload để xem redesign hiện có; nếu vẫn thấy chưa đủ mới thêm side-help. Tránh sửa mù trên phản hồi dựa build cũ.

---

## D-006 · Docs → chỉ 6 file canonical, không tạo MD mới rải rác
**Ngày:** 2026-08-09 · **Trạng thái:** ✅ Active · **Liên quan:** `docs/INDEX.md`

**Ngữ cảnh:** Repo tích luỹ 44+ file `*_SUMMARY.md`, `STEP*.md`, `ARCHITECTURE_PART*.md` từ các phiên trước — trùng lắp, dễ lệch nhau, khó tìm.

**Quyết định:** Gộp thành 6 file: `ARCHITECTURE.md`, `DATABASE.md`, `PIPELINE.md`, `UI_UX.md`, `FEATURES.md`, `IMPLEMENTATION.md`. File cũ chuyển vào `docs/_source_snapshots/`. Thay đổi mới → cập nhật section trong file phù hợp + Changelog, **không tạo MD mới**. Ngoại lệ hợp lệ hiện tại: `DECISIONS.md` (file này) và các file trong `research/` (đầu ra nghiên cứu, không phải doc kiến trúc).

**Hệ quả:** Agent muốn ghi tài liệu mới phải chọn 1 trong 6 file. Nếu nội dung không thuộc file nào, phải hỏi trước khi tạo file thứ 7.

---

## D-005 · Scheduled task tuyệt đối không `git commit` / `git push`
**Ngày:** 2026-08-04 · **Trạng thái:** ✅ Active · **Liên quan:** skill `dart-research-daily`

**Ngữ cảnh:** Agent chạy tự động mỗi sáng, có thể sửa nhiều file. Nếu tự commit sẽ đè tay bạn hoặc lộ secret.

**Quyết định:** Scheduled task chỉ được sửa file trong working tree. Trước khi sửa phải `git status`; file nào bạn đang modify → không đụng, ghi vào nhật ký là bị chặn. Không commit, không push, không đổi branch. Người dùng review và commit tay.

**Hệ quả:** Bạn phải commit định kỳ (không thì working tree phình). Agent không thể "hoàn thành" mốc theo cách CI/CD.

---

## D-004 · Amendment #A-001 — Cluster-bootstrap LRT thay χ²₁ cho H0 test của α
**Ngày:** 2026-08-06 · **Trạng thái:** 🟡 Provisional (chờ 1000-rep xác nhận `p_cluster_boundary` ≤ 0.05) · **Liên quan:** `research/dart_model.py`, `research/AMENDMENTS.md`, `research/PREREGISTRATION.md`

**Ngữ cảnh:** Type-I error mô phỏng weeks=4 → 0.183 [0.114, 0.253], weeks=8 → 0.146 [0.092, 0.223] — **anti-conservative** so với nominal 0.05. χ²₁ dùng cho LRT trên dữ liệu clustered (nhiều review/user) sai. Boot LR quantile / χ²₁ = 2.8×–3.7× ở q70–q99 → có clustering thật.

**Quyết định:** Thay LRT χ²₁ bằng **cluster-bootstrap LRT** (resample theo user), report `p_cluster_boundary` với boundary correction cho α ≥ 0 constraint. Preregistration cập nhật tương ứng.

**Hệ quả:** Cần chạy 1000-rep bootstrap (~2 phút) để xác nhận Type-I về mức nominal. Nếu vẫn không đạt → phải giảm claim hoặc chuyển sang permutation test.

---

## D-003 · Tách DB nghiên cứu khỏi production
**Ngày:** 2026-08-07 · **Trạng thái:** ✅ Active · **Liên quan:** `lib/researchDb.ts`, `.env.research`, `research/backup_research_db.sh`

**Ngữ cảnh:** Dữ liệu học viên trong nghiên cứu (200 người, 8 tuần) phải cách ly khỏi user thật, phải có audit trail, phải backup được. Production Mongo trên M0 free tier (500-conn cap) không đủ.

**Quyết định:** Cluster Atlas riêng cho nghiên cứu; connection qua `lib/researchDb.ts` với `MONGO_URI` riêng trong `.env.research`; backup daily tự động (`backup_research_db.sh`, retention 30 ngày, refuse production URI); auth layer riêng cho endpoint `/api/research/*`.

**Hệ quả:** Không được đọc/ghi qua `lib/mongodb.ts` cho dữ liệu nghiên cứu. Trước khi mở enrol phải: (1) chạy `create_indexes.js`, (2) restore drill (chưa xong tính đến 2026-08-09).

---

## D-002 · Blinding điều kiện thí nghiệm (DART vs baseline SM2)
**Ngày:** 2026-08-22 (Ngày 19 kế hoạch) · **Trạng thái:** ✅ Active · **Liên quan:** `app/models/Participant.ts` (field `condition`), tests `experimentBlinding`

**Ngữ cảnh:** Nếu học viên biết mình ở nhóm nào → placebo/nocebo, mất giá trị RCT.

**Quyết định:** Field `condition` trong `Participant` không lộ ra client; UI hai nhánh render giống hệt nhau; nhãn "DART" / "SM2" không xuất hiện ở đâu học viên có thể thấy. Phỏng vấn giữa pilot (H9, Ngày 35) kiểm tra làm mù có hiệu quả.

**Hệ quả:** Mọi thay đổi UI phía học viên phải kiểm tra không rò rỉ điều kiện. Test `experimentBlinding` gate PR.

---

## D-001 · Wordbank hai tầng (tier A high-frequency, tier B mid-frequency)
**Ngày:** 2026-08-26 (Ngày 23 kế hoạch) · **Trạng thái:** ✅ Active · **Liên quan:** `data/wordbank_pool_seed.json`, `lib/defaultWordBankPool.ts`, `research/WORDBANK_TWO_TIER_DESIGN.md`

**Ngữ cảnh:** Bộ từ mục tiêu phải đủ khó để có headroom học (loại từ >70% đã biết qua H5) nhưng vẫn nằm trong CEFR B1–B2 để pretest/posttest có thang so được.

**Quyết định:** Hai tầng — A (B1 core, để làm anchor) và B (B2 mid-frequency, target chính để đo học). H5 (familiarity screening 20 người ngoài mẫu) loại từ đã biết trên >70%.

**Hệ quả:** `seedFromUserAndDate` phải deterministic để reproduce (test `wordBankSelector` cover). Trước pilot phải hoàn tất H5 và freeze bộ từ.

---
