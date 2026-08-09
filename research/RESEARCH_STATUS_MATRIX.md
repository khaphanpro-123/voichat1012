# Ma trận trạng thái — Đã / Đang / Sẽ làm

**Cập nhật:** 2026-08-09 (Ngày 6/45)
**Liên kết bản thảo:** [`PAPER_DRAFT_v1.md`](./PAPER_DRAFT_v1.md)
**Nguyên tắc đọc:** mỗi hàng nối một khối công việc với section trong bài báo — nếu hàng đó "Chưa xong" thì section tương ứng trong paper vẫn còn `[TBD]`.

Ký hiệu: ✅ Done · 🔵 Doing · ⬜ Will do · ⚠️ Có vấn đề · ⛔ Bị chặn

---

## 1. Cơ sở lý thuyết & thiết kế (Paper §1, §2)

| Việc | Trạng thái | File | Section paper | Ghi chú |
|---|---|---|---|---|
| Rationale + đặt vấn đề | ✅ | `PREREGISTRATION.md §3` | §1 Introduction | Draft xong |
| Literature review SRS + desirable difficulties | ✅ | `PAPER_DRAFT_v1.md §2.1–2.3` | §2 | Còn thiếu 5 references `[TBD]` (Cheng 2022, Traxler 2024, Ye 2022, Nguyen & Godfroid 2020, Pham & Nguyen 2024) |
| 3 RQ + hypothesis chính thức | ✅ | `PREREGISTRATION.md §4` | §2.4 | Đã pre-registered, one-sided H₁ cho α > 0 |
| Ký DESIGN_FREEZE | ✅ | `DESIGN_FREEZE.md` | §3 (implicit) | Ký 2026-08-07 |

## 2. Phương pháp & mô hình (Paper §3)

| Việc | Trạng thái | File | Section paper | Ghi chú |
|---|---|---|---|---|
| DART model implementation | ✅ | `dart_model.py` | §2.4 (formula), §3.6 | HLR baseline + DART với α |
| Cluster-bootstrap LRT | ✅ | `dart_model.py::lrt_alpha_cluster_bootstrap` | §3.6, §3.7 | Amendment #A-001 |
| Test regression cho model | ✅ | `test_dart_model.py` | — (methods rigor) | 13/13 PASS |
| Power analysis + Type-I | ⚠️ | `power_analysis.py`, `reports/type1_*.json` | §3.2 (N-justif), Appendix B | Sandbox chạy 110 reps → confirm anti-conservative. Full 200 reps + 1000-boot **chưa chạy trên laptop** |
| Cluster-bootstrap null study | ✅ | `lr_null_distribution_study.py` | §3.7 | Ratio 2.8×–3.7× χ²₁ tail |
| DeLong out-of-sample test | ⬜ | *chưa có script* | §3.6 (planned) | Cần viết `research/delong_test.py` khi có log thật |
| Word bank 60 từ pre-registered | ✅ | `lib/wordBank.ts` | §3.3 | Đã freeze; H5 pilot 20 người sẽ lọc từ >70% biết |
| 4 dạng retrieval task | ✅ | `lib/retrievalTasks.ts`, `lib/mcq.ts` | §3.3 | d=0/1/2/3 đủ |
| Posttest 3 phần | ✅ | `lib/posttestBuilder.ts`, `__tests__/posttestBuilder.test.ts` | §3.4 | 28/28 PASS |
| Rubric + LLM judge | ✅ | `lib/judgeRubric.ts`, `lib/llmJudge.ts` | §3.5 | 26/26 PASS. Cần ICC ≥ .70 |
| Backend endpoint hợp nhất `/api/research/review` | ✅ | `app/api/research/review/route.ts` | §3.5 (instrumentation) | Idempotent qua clientEventId |
| Tách DB research + backup script | ✅ | `lib/researchDb.ts`, `backup_research_db.sh` | §3.5 | Backup script viết xong; **restore drill chưa chạy** |
| Blinding (làm mù điều kiện) | ✅ | `lib/experimentBlinding.ts` | §3.1 | Test PASS |

## 3. Hạ tầng vận hành (Paper §3.5 instrumentation)

| Việc | Trạng thái | File | Ghi chú |
|---|---|---|---|
| `verify_env.js` pre-flight | 🔵 chờ chạy | `research/verify_env.js` | User chạy trên laptop, chưa báo kết quả |
| `create_indexes.js` migration | 🔵 chờ chạy | `research/create_indexes.js` | Bắt buộc trước khi mở enrol |
| Restore drill | ⬜ | `backup_research_db.sh` + mongorestore | Ngày 6 exit criterion, chưa chạy |
| Windows Task Scheduler cho backup daily | ⬜ | — | Cài `mongodump` binary trước |
| Data-quality check nightly | ✅ (code) | `research/dq_check.py` | Chưa hook cron |
| Export logs anonymized | ✅ (code) | `research/export_logs.py` | Chưa test end-to-end |
| Async LLM-judge queue (Upstash) | ⛔ | Ngày 11 | Chờ verify_env.js |
| Cache task + provider fallback | ⛔ | Ngày 12 | Chờ Ngày 11 |

## 4. Giao diện & trải nghiệm (Paper §3.3 UI, §5.4 limitations)

| Việc | Trạng thái | File | Ghi chú |
|---|---|---|---|
| UI spec redesign | ✅ | `research/UI_REDESIGN_SPEC.md` | Draft v1 |
| HTML mockup 4 dạng card | ✅ | `research/mockups/review_ui_v1.html` | Mở Chrome test được |
| Component React `<ReviewCard>` | ⬜ | *sẽ tạo* | Sau khi PI + supervisor ký spec |
| Playwright screenshot regression | ⬜ | *sẽ tạo* | Sau khi component xong |
| Pilot UX 3 người ngoài mẫu | ⬜ | — | Ngày 12 theo spec |
| Freeze UI vào DESIGN_FREEZE Mục 5bis | ⬜ | — | Ngày 14 |

## 5. Sản phẩm production (không thuộc RCT nhưng dùng chung repo)

| Việc | Trạng thái | File | Ghi chú |
|---|---|---|---|
| Wordbank 2 tầng (cold-start + personalized) | ✅ | `lib/defaultWordBankPool.ts`, `lib/wordBankSelector.ts`, `data/wordbank_pool_seed.json` | 16/16 test PASS. Cách ly khỏi nghiên cứu |
| Pool seed 100 từ | ✅ | `data/wordbank_pool_seed.json` | Mở rộng lên 300 (Ngày 15), 500-1000 (Ngày 30) |
| Endpoint API cho selector | ⬜ | `app/api/vocabulary/select/route.ts` | Sẽ viết |
| Migration `User.wordBankMode` field | ⬜ | *sẽ tạo* | Cần thêm 2 field `wordBankMode`, `personalWordCount` |
| Admin dashboard % cold-start | ⬜ | — | Sau khi có data |
| Sắp xếp lại repo (docs/, scripts/) | ✅ | `docs/INDEX.md` | Xong 2026-08-09 |

## 6. Người dùng — nhất định cô/em phải làm (H1–H10)

| # | Việc | Hạn | Trạng thái | Ảnh hưởng nếu trễ |
|---|---|---|---|---|
| H1 | Nộp IRB | Ngày 1 | ✅ 2026-08-07 | Đường găng dài nhất, đã unblock |
| H2 | Ký DESIGN_FREEZE | Ngày 1 | ✅ 2026-08-07 | — |
| H3 | Tạo `.env.research` | Ngày 2 | ✅ 2026-08-07 | Đã mở khoá Ngày 6 |
| H4 | Pre-registration OSF | Ngày 26 (2026-08-29) | ⬜ | Chờ IRB duyệt |
| H5 | Familiarity screen 20 người | Ngày 23 (2026-08-26) | ⬜ | Chặn word bank final |
| H6 | Tuyển 2 giáo viên chấm rubric | Ngày 25 (2026-08-28) | ⬜ | Chặn ICC → chặn RQ3 |
| H7 | Tuyển 15–20 người pilot | Ngày 27 (2026-08-30) | ⬜ | Chặn pilot |
| H8 | Onboarding pilot | Ngày 29 (2026-09-01) | ⬜ | Chặn Tuần 5 |
| H9 | Phỏng vấn 5 người giữa pilot | Ngày 35 (2026-09-07) | ⬜ | Kiểm tra làm mù |
| H10 | Tuyển 200 người nghiên cứu chính | Ngày 44 (2026-09-16) | ⬜ | Đường găng thứ 2 sau IRB. Bắt đầu tuyển sớm được thì tốt |

## 7. Phân tích & viết bài — sau pilot (Ngày 29→)

| Việc | Trạng thái | Section paper | Ghi chú |
|---|---|---|---|
| Fit DART lần đầu trên dữ liệu thật | ⬜ | §4.2 (RQ1 result) | Ngày 37 |
| Sửa vấn đề định danh α (ε-exploration) | ⬜ | §3.4 (procedure) | Ngày 38 |
| Validate LLM-Judge (ICC) | ⬜ | §3.5 + §4.4 (precondition) | Ngày 39–40 |
| Cập nhật power bằng param thật | ⬜ | §3.2 | Ngày 41 |
| Go/No-Go cho main study | ⬜ | — | Ngày 43 |
| Nghiên cứu chính chạy | ⬜ | — | Ngày 45 → tuần 8 sau |
| Delayed posttest tuần 10 | ⬜ | §3.4 | ~2026-11-19 |
| Viết Results §4 với số thật | ⬜ | §4 | ~2026-11-25 |
| Viết Discussion §5 hoàn chỉnh | ⬜ | §5 | ~2026-12-10 |
| Nộp bản thảo lên C&E | ⬜ | — | Dự kiến ~2027-01-15 |

---

## Tóm tắt tuần này

- **Đã xong tuần 1 + phần lớn tuần 2 kỹ thuật** (batch code chạy sớm).
- **Đang chờ 3 việc laptop của em/cô**: `verify_env.js`, `create_indexes.js`, restore drill.
- **Rủi ro lớn nhất tuần này**: nếu Upstash Redis không config được → Ngày 11 (LLM-Judge queue) không chạy được → Ngày 39–40 (ICC validate) trễ → Discussion §5 phải khai không dùng LLM primary.
- **Không có mốc H nào QUÁ HẠN.**

## Tóm tắt rủi ro đường găng (chi tiết tại `RESEARCH_ROADMAP_DART_CARTS.md`)

| Rủi ro | Xác suất | Tác động | Biện pháp |
|---|---|---|---|
| IRB duyệt > 8 tuần | Trung bình | Cao — dời cả study | Đã nộp sớm 2026-08-07 |
| Tuyển 200 người không đủ | Trung bình | Cao — N < 200 → power < .80 cho RQ2 | Sẽ tuyển trước 2 tuần (Ngày 30 thay vì 44) |
| α không định danh do retrievalType lệch | Thấp (đã fix bằng ε=.10) | Rất cao — RQ1 vô nghĩa | Data-quality check chạy nightly |
| LLM ICC < .70 | Trung bình | Trung bình — RQ3 → exploratory | Đã có kế hoạch fallback human rater |
| Type-I inflation quay lại sau cluster-boot | Thấp | Rất cao | Chạy 1000 reps confirm trước pilot |
| Cluster-bootstrap chậm quá (N=200) | Thấp | Thấp — chỉ tăng compute | ~10 phút chấp nhận được cho analysis cuối |

---

*Cập nhật file này khi có thay đổi trạng thái. Đồng bộ với `RESEARCH_PROGRESS.md` (nhật ký hằng ngày) và `PLAN_45_DAYS.md` (lịch cứng).*
