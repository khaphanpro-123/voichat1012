# Documentation — Canonical Index

**Cập nhật 2026-08-09.** Đã gộp 44+ file MD rải rác thành **6 file canonical**.
Từ nay khi có nội dung mới → **cập nhật section trong file phù hợp**, không tạo file MD mới.

---

## Bộ 6 file canonical

| File | Nội dung | Khi nào cập nhật |
|---|---|---|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Kiến trúc frontend, backend, database, hosting, algorithms, data flow | Đổi kiến trúc, thêm/xoá layer, đổi hosting |
| [`DATABASE.md`](./DATABASE.md) | Schema, indexes, backup/restore, production vs research DB | Thêm collection, thêm index, đổi backup policy |
| [`PIPELINE.md`](./PIPELINE.md) | 8-step vocabulary extraction pipeline | Đổi thuật toán trong `python-api/complete_pipeline.py` |
| [`UI_UX.md`](./UI_UX.md) | Nguyên tắc thiết kế, palette, review UI, accessibility, mockup | Redesign UI, đổi palette, thêm component pattern |
| [`FEATURES.md`](./FEATURES.md) | Từng feature (camera, noise detection, translation, …) | Thêm feature mới → thêm section |
| [`IMPLEMENTATION.md`](./IMPLEMENTATION.md) | Rolling log — thông báo "đã làm xong X" | **Mỗi khi hoàn thành mảng công việc lớn** |
| [`DECISIONS.md`](./DECISIONS.md) | ADR-lite — quyết định thiết kế / hướng đi đã chốt | Agent tự chèn khi bạn nói "chốt", "quyết định", "từ nay dùng X" |

---

## Quy tắc thêm nội dung

1. **Thay đổi kiến trúc** → thêm bullet vào section tương ứng + entry Changelog trong `ARCHITECTURE.md`. Đừng viết `NEW_ARCHITECTURE_v2.md`.
2. **Fix bug tính năng** → thêm entry Changelog cuối section feature trong `FEATURES.md`. Đừng viết `<FEATURE>_FIX_SUMMARY.md`.
3. **Xong milestone** → thêm entry đầu section "Log" trong `IMPLEMENTATION.md`. Đừng viết `FINAL_SUMMARY_v3.md`.
4. **Đổi schema DB** → cập nhật bảng trong `DATABASE.md` + Changelog. Đừng viết `SCHEMA_MIGRATION_NOTES.md`.
5. **Redesign UI** → thêm section mới trong `UI_UX.md`, chèn vào mục lục.
6. **Feature mới** → thêm section trong `FEATURES.md`, chèn vào mục lục.

---

## Root-level (files ngoài `docs/`)

| File | Purpose |
|---|---|
| [`../CLAUDE.md`](../CLAUDE.md) | Hướng dẫn AI coding agent — authoritative |
| [`../AGENTS.md`](../AGENTS.md) | Multi-agent orchestration |
| [`../RESEARCH_PROGRESS.md`](../RESEARCH_PROGRESS.md) | Nhật ký nghiên cứu hằng ngày (scheduled task) |
| [`../PLAN_45_DAYS.md`](../PLAN_45_DAYS.md) | Lịch 45 ngày |
| [`../RESEARCH_ROADMAP_DART_CARTS.md`](../RESEARCH_ROADMAP_DART_CARTS.md) | Roadmap dài hạn, rủi ro, target journal |

**Không** để MD kỹ thuật (kiến trúc/pipeline/feature) ở root — chuyển vào `docs/`.

---

## `research/` — Nghiên cứu DART/CARTS

Là **khu vực riêng**, không thuộc canonical docs của app. Xem `research/README.md`.

File chính:

- `research/PAPER_DRAFT_v1.md` — **bản thảo bài báo** (target *Computers & Education*)
- `research/RESEARCH_STATUS_MATRIX.md` — bảng done/doing/will-do, link vào section paper
- `research/PREREGISTRATION.md`, `research/DESIGN_FREEZE.md`, `research/AMENDMENTS.md`
- `research/WORDBANK_TWO_TIER_DESIGN.md`, `research/mockups/*`
- `research/CALIBRATION_GUIDE.md`, `research/PILOT_CHECKLIST.md`, `research/IRB_SUBMISSION_CHECKLIST.md`
- `research/reports/*` — output mô phỏng (đánh dấu rõ, KHÔNG phải kết quả)

---

## `scripts/` — Scripts

- `scripts/legacy/` — 33 file `fix-*.js`, `write-*.js`, `debug-*.html/py`, `.bat` cũ (không xoá — giữ tra cứu)
- `scripts/manual-tests/` — 9 file `test-*.html` để test tay trong browser

---

## `docs/_source_snapshots/` — Snapshot nguồn trước khi gộp

Không đọc file này để lấy thông tin mới — thông tin **đã ở trong file canonical**. Snapshot chỉ để tra cứu lịch sử khi cần biết "file gốc nào chứa nội dung này". Bao gồm:

- `architecture/` — 7 file gốc → nay ở `ARCHITECTURE.md`
- `pipeline/` — 18 file gốc → nay ở `PIPELINE.md`
- `features/` — 6 file gốc → nay ở `FEATURES.md`
- `archive/` — 9 file summary/checklist cũ → nay ở `IMPLEMENTATION.md`
- `UI_REDESIGN_SPEC.md`, `IMPLEMENTATION_LOG.md`, `FILE_PROCESSING_PIPELINE.md` — file lẻ đã được gộp

**Sau 90 ngày, nếu file canonical ổn định, có thể xoá `_source_snapshots/`.** Ghi trong ticket để nhớ.
