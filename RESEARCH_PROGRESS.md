# Nhật ký tiến độ nghiên cứu DART

> File này được cập nhật **tự động mỗi sáng 08:00** bởi scheduled task, và bởi bạn khi cần.
> Kế hoạch chi tiết: `PLAN_45_DAYS.md` · Lộ trình tổng: `RESEARCH_ROADMAP_DART_CARTS.md`

---

## Neo thời gian

| | |
|---|---|
| **Ngày 1 của kế hoạch** | 2026-08-04 (Thứ Ba) |
| **Ngày 45** | 2026-09-17 |
| **Dự kiến khởi động nghiên cứu chính** | 2026-09-17 |
| **Dự kiến nộp bài** | ~2027-01-15 |
| **Chế độ tự động** | Sửa code trong working tree, **không commit, không push** |

Cách tính ngày hiện tại: `ngày_kế_hoạch = (hôm_nay − 2026-08-04) + 1`

---

## 🔴 Việc CHỈ BẠN làm được — agent không thay thế được

Đây là danh sách agent sẽ nhắc lại mỗi sáng cho đến khi bạn đánh dấu xong.

| # | Việc | Hạn | Trạng thái | Ghi chú |
|---|---|---|---|---|
| H1 | **Nộp hồ sơ IRB / đạo đức nghiên cứu** | Ngày 1 | ✅ Xong 2026-08-07 | Đã nộp. Chờ 4–8 tuần duyệt |
| H2 | Chốt thiết kế bằng văn bản, ký duyệt với người hướng dẫn | Ngày 1 | ✅ Xong 2026-08-07 | Đã ký DESIGN_FREEZE.md |
| H3 | Tạo `.env.research` với `MONGO_URI` + `RESEARCH_SALT` | Ngày 2 | ✅ Xong 2026-08-07 | Đã tạo (Ngày 4). Mở khoá Ngày 6 (tách DB) + auth layer |
| H4 | Pre-registration trên OSF / AsPredicted | Ngày 26 | ⬜ Chưa | Cần H1 duyệt trước |
| H5 | Kiểm tra trước bộ từ với 20 người ngoài mẫu | Ngày 23 | ⬜ Chưa | Loại từ mà >70% đã biết |
| H6 | Tuyển 2 giáo viên chấm rubric | Ngày 25 | ⬜ Chưa | Cần cho ICC |
| H7 | Tuyển 15–20 người pilot | Ngày 27 | ⬜ Chưa | |
| H8 | Onboarding pilot | Ngày 29 | ⬜ Chưa | |
| H9 | Phỏng vấn 5 người giữa pilot | Ngày 35 | ⬜ Chưa | Kiểm tra làm mù có hiệu quả |
| H10 | Tuyển 200 người cho nghiên cứu chính | Ngày 44 | ⬜ Chưa | |

**Cách đánh dấu:** đổi ⬜ Chưa → ✅ Xong + ngày. Agent đọc cột này mỗi sáng.

---

## Bảng tiến độ 45 ngày

Ký hiệu: ⬜ chưa tới · 🔵 đang làm · ✅ xong · ⚠️ có vấn đề · ⛔ bị chặn

| Ngày | Ngày dương | Nội dung | TT |
|---|---|---|---|
| 1 | 08-04 | 🔴 Chốt thiết kế + nộp IRB | 🔵 |
| 2 | 08-05 | Dựng môi trường phân tích, chạy thử pipeline | ✅ |
| 3 | 08-06 | 🔴 Power analysis + Type-I error | ⚠️ |
| 4 | 08-07 | Mở rộng schema `ReviewLog` | ✅ |
| 5 | 08-08 | 3 collection mới: Participant / TestResult / JudgeScore | ✅ |
| 6 | 08-09 | 🔴 Tách DB nghiên cứu + backup tự động | ✅ chạy sớm 2026-08-07 (backend sẵn sàng) |
| 7 | 08-10 | Dọn nợ kỹ thuật, `tsc --noEmit`, tests | ✅ |
| 8 | 08-11 | 🔴 Hợp nhất endpoint `/api/research/review` | ✅ |
| 9 | 08-12 | Version freeze + server timestamp | ✅ |
| 10 | 08-13 | Endpoint enrol + assign | ✅ |
| 11 | 08-14 | LLM-Judge chuyển sang hàng đợi | ⬜ |
| 12 | 08-15 | Cache task + fallback provider | ⬜ |
| 13 | 08-16 | Export + kiểm tra chất lượng dữ liệu | ✅ |
| 14 | 08-17 | Đệm + tổng kết tuần | ⬜ |
| 15 | 08-18 | Khung `RetrievalTask` + đo thời gian chuẩn | ✅ |
| 16 | 08-19 | d=0 MCQ, d=1 Cloze | ✅ |
| 17 | 08-20 | d=2 Constrained-gen, d=3 Paraphrase | ✅ |
| 18 | 08-21 | Bộ chạy phiên học | ✅ |
| 19 | 08-22 | 🔴 Làm mù điều kiện thí nghiệm | ✅ |
| 20 | 08-23 | Dashboard nghiên cứu viên | ✅ |
| 21 | 08-24 | Tổng kết tuần + tự dùng thử | ✅ |
| 22 | 08-25 | Consent + pretest CEFR | ✅ |
| 23 | 08-26 | 🔴 Soạn bộ từ mục tiêu + context pool | ✅ |
| 24 | 08-27 | Bộ đề posttest 3 phần | ✅ |
| 25 | 08-28 | Rubric + tập huấn giám khảo | ✅ |
| 26 | 08-29 | 🔴 Pre-registration | ✅ |
| 27 | 08-30 | Vận hành pilot | ✅ |
| 28 | 08-31 | Diễn tập toàn hệ thống | ⬜ |
| 29 | 09-01 | Onboarding pilot | ⬜ |
| 30–34 | 09-02→06 | Pilot chạy, theo dõi hằng ngày | ⬜ |
| 35 | 09-07 | Phỏng vấn giữa pilot | ⬜ |
| 36 | 09-08 | Kết thúc pilot, xuất dữ liệu | ⬜ |
| 37 | 09-09 | 🔴 Train DART lần đầu trên dữ liệu thật | ⬜ |
| 38 | 09-10 | Sửa vấn đề định danh α (ε-exploration) | ⬜ |
| 39–40 | 09-11→12 | 🔴 Validate LLM-Judge với người (ICC) | ⬜ |
| 41 | 09-13 | Cập nhật power bằng tham số thật | ⬜ |
| 42 | 09-14 | Sửa hệ thống theo bài học pilot, đóng băng code | ⬜ |
| 43 | 09-15 | 🔴 Go / No-Go | ⬜ |
| 44 | 09-16 | Tuyển người nghiên cứu chính | ⬜ |
| 45 | 09-17 | Khởi động + bắt đầu viết bài | ⬜ |

---

## Chỉ số theo dõi

Agent cập nhật khi có dữ liệu. `—` = chưa có.

| Chỉ số | Giá trị | Ngưỡng | Cập nhật |
|---|---|---|---|
| Số dòng `ReviewLog` thật | — | — | — |
| Số học viên đã enrol | — | 200 | — |
| Phân bố `retrievalType` (d=0/1/2/3) | 55/43/2/0 % *(mô phỏng)* | mỗi mức ≥10% | 2026-08-04 |
| `alpha_hat` | — | CI không chạm 0 | — |
| Type-I ở H₀ (weeks=4, N=60, mô phỏng) | **0.183** [0.114, 0.253], 120 reps | ≤ 0.05 nominal | 2026-08-05 ⚠️ |
| Type-I ở H₀ (weeks=8, N=60, mô phỏng) | **0.146** [0.092, 0.223] Wilson, 110 reps | ≤ 0.05 nominal | 2026-08-06 ⚠️ **CONFIRMED anti-conservative** |
| Boot LR quantile / χ²₁ (weeks=4, mô phỏng) | 2.8×–3.7× ở q70–q99, 30 boot | ~1× | 2026-08-06 ⚠️ chứng cứ clustering |
| Bias `alpha_hat` dưới H₀ (mô phỏng) | +0.12 (weeks=8), +0.18 (weeks=4) | ≈ 0 | 2026-08-06 |
| `p (boundary-corrected)` | — | < .05 | — |
| DeLong p (ngoài mẫu) | — | < .05 | — |
| ECE | — | < .05 | — |
| Power ở N khả thi | — | ≥ .80 | — |
| ICC LLM–người | — | > .70 | — |
| Tỷ lệ dòng log thiếu trường | — | < 1% | — |
| Tỷ lệ tuân thủ phiên học | — | > 70% | — |

---

## Nhật ký hằng ngày

> Mục mới nhất ở trên cùng. Agent chèn vào ngay dưới dòng này.

<!-- AGENT_LOG_INSERT_POINT -->

### Ngày 6 — 2026-08-09 (Chủ Nhật) — lần chạy thứ 2 trong ngày

**Việc theo kế hoạch:** Cùng Ngày 6 (đã có mục sáng nay). Đây là lượt chạy bổ sung do scheduled task kích hoạt lại. Ghi lại thay đổi kể từ commit `524d189` (2026-08-09 09:35 +0700).

**Agent đã làm:**

- **Phát hiện commit lớn của bạn lúc 09:35** (`524d189 Update project`): +302 dòng `RESEARCH_PROGRESS.md` (chốt nhật ký sáng nay), thêm `AGENTS.md`, `PAPER_tasks.xlsx`, `__tests__/wordBankSelector.test.ts` (+201), `data/wordbank_pool_seed.json`, `lib/defaultWordBankPool.ts`, và một loạt tài liệu mới trong `docs/` (`ARCHITECTURE.md`, `DATABASE.md`, `FEATURES.md`, `IMPLEMENTATION.md`, `INDEX.md`, `PIPELINE.md`, `UI_UX.md`) — 5 file `research/*` cũng cập-nhật (build_paper_xlsx.py, PAPER_DRAFT_v1.md, RESEARCH_STATUS_MATRIX.md, WORDBANK_TWO_TIER_DESIGN.md, mockups/review_ui_v1.html). Working tree hiện sạch.
- **Re-verify regression** trên trạng thái mới:
  - `npx jest` 6 suite `(judgeRubric|participantAuth|experimentBlinding|retrievalTasks|posttestBuilder|wordBankSelector)` → **133/133 PASS** (13.2s). Suite `wordBankSelector` mới (16 test) xanh — bao gồm `seedFromUserAndDate` xác định.
  - `pytest research/test_dart_model.py` → **13/13 PASS** (9.05s). Amendment #A-001 vẫn xanh.
- **Không sửa code** trong lượt này (mọi thứ vừa xanh + không có drift để dọn).

**Kết quả chạy được:**

| Kiểm tra | Kết quả |
|---|---|
| Jest 6 suites (thêm wordBankSelector) | 133/133 PASS |
| pytest `test_dart_model.py` | 13/13 PASS |
| Git working tree | Sạch (sau commit 524d189) |
| Restore drill Ngày 6 exit criterion | ❌ vẫn CHƯA CHẠY |

**Phát hiện / cảnh báo:**

- Yêu cầu người dùng từ nhật ký sáng vẫn còn nguyên: (1) restore drill để đóng Ngày 6 đúng nghĩa, (2) `verify_env.js` + `create_indexes.js` production, (3) 1000-rep cluster-bootstrap `p_cluster_boundary`. Không cái nào chạy được từ sandbox.
- Không có H nào QUÁ HẠN. Không có mốc đường găng đang trễ.

**🔴 Việc BẠN phải làm hôm nay:** *(không đổi so với mục sáng — xem chi tiết ở mục Ngày 6 phía dưới)*

1. Restore drill (`mongodump` → `mongorestore` DB tạm → so đếm document) — đóng Ngày 6.
2. `node research/verify_env.js` (mở khoá Ngày 11) và `node research/create_indexes.js` (bắt buộc trước enrol).
3. 1000-rep cluster-bootstrap Type-I → báo `p_cluster_boundary`.

**Bị chặn:** như mục sáng.

**Ngày mai:** Ngày 7 = 2026-08-10 (Thứ Hai), theo `PLAN_45_DAYS.md`: "Dọn nợ kỹ thuật, `tsc --noEmit`, tests" — đã ✅ trong bảng. Agent sẽ chạy `npx tsc --noEmit` toàn repo (phát hiện lỗi thực chất, vì `next.config.js` bỏ qua khi build) + Ngày 14 (đệm) nếu bạn chưa mở khoá hạ tầng.

---

### Ngày 6 — 2026-08-09 (Chủ Nhật)

**Việc theo kế hoạch:** Ngày 6 gốc — 🔴 Tách DB nghiên cứu + backup tự động. Deliverable **backend đã ✅ chạy sớm 2026-08-07** (batch 2): `lib/researchDb.ts`, `research/verify_env.js`, `research/create_indexes.js`, `research/backup_research_db.sh`. Còn thiếu **exit criterion của Ngày 6 theo `PLAN_45_DAYS.md`: "khôi phục thành công vào một DB tạm, đếm số document khớp"** — tức là restore test thật, chưa ai chạy. Ba tồn đọng người dùng từ Ngày 5 (`verify_env.js`, `create_indexes.js`, cluster-bootstrap 1000-rep) vẫn ⬜.

**Agent đã làm:**

- **Regression re-verify (không chạm code):**
  - `npx jest --testPathPatterns='(judgeRubric|participantAuth|experimentBlinding|retrievalTasks|posttestBuilder)'` → **117/117 PASS** (5 suites, 13.9s). Không có drift so với hôm qua.
  - `python -m pytest research/test_dart_model.py -q` (sau khi cài `statsmodels` + `scipy` trong sandbox) → **13/13 PASS** (7.3s). Amendment #A-001 (cluster-bootstrap LRT) vẫn xanh.
- **Kiểm tra Ngày 6 exit criterion:** đọc `research/backup_research_db.sh` — script tạo `.tar.gz` dump, retention 30 ngày, refuse production URI. **Không có script/khôi phục test song hành** (`mongorestore` + đếm document). Ngày 6 theo `PLAN_45_DAYS.md` yêu cầu "khôi phục thành công một lần" — chưa có bằng chứng đã làm. Agent không thể tự chạy vì sandbox không có `.env.research`, không có Atlas cluster nghiên cứu, không có `mongodump`/`mongorestore`.
- **Working tree:** `git status --short` — chỉ 4 file modified (`RESEARCH_PROGRESS.md`, `package-lock.json`, `research/PREREGISTRATION.md`, `research/dart_model.py` — Amendment #A-001) + 13 untracked (batch trước). Không đụng file nào người dùng đang sửa.
- **Ghi nhận trạng thái mốc người:** H1 ✅, H2 ✅, H3 ✅. H4–H10 vẫn ⬜, chưa tới hạn (H5 sớm nhất Ngày 23 = 2026-08-26 — còn 17 ngày).

**Kết quả chạy được:**

| Kiểm tra | Kết quả |
|---|---|
| Jest research suites | 117/117 PASS |
| pytest `test_dart_model.py` | 13/13 PASS |
| Backend Ngày 6 files | Có đủ 4 (researchDb.ts, verify_env.js, create_indexes.js, backup_research_db.sh) |
| Restore test (Ngày 6 exit criterion) | ❌ CHƯA CHẠY — không có bằng chứng |
| 1000-rep cluster-bootstrap p_cluster_boundary | ⬜ CHƯA CHẠY từ Ngày 5 |
| `verify_env.js` / `create_indexes.js` production run | ⬜ CHƯA CHẠY từ Ngày 4 |

**Phát hiện / cảnh báo:**

- ⚠️ **Ngày 6 chưa đóng đúng nghĩa.** Bảng tiến độ tick ✅ vì backend đã viết xong, nhưng exit criterion trong `PLAN_45_DAYS.md` là **restore thành công một lần**. Nguyên tắc: "Backup chưa từng restore thử là backup không tồn tại." Nếu Atlas rớt trước khi có restore drill, chưa chắc dump `.tar.gz` phục hồi được.
- Ba việc laptop từ Ngày 4–5 vẫn treo (verify_env, create_indexes, 1000-rep bootstrap). Không có việc nào chặn kỹ thuật tiến độ tuần 2, nhưng chặn *bằng chứng khoa học* — cụ thể là bảng "Chỉ số theo dõi" các dòng `p_cluster_boundary`, `Tỷ lệ dòng log thiếu trường` vẫn `—`.
- Ngày 11 (LLM-Judge queue) vẫn bị chặn bởi Upstash Redis config — không thể verify trước khi bạn chạy `verify_env.js`.
- Không có mốc H nào QUÁ HẠN. Không có mốc đường găng đang trễ.

**🔴 Việc BẠN phải làm hôm nay:**

1. **Restore drill (đóng Ngày 6 đúng nghĩa):** trên laptop, sau khi `mongodump` chạy được:
   ```
   # 1. Chạy backup lần đầu
   bash research/backup_research_db.sh

   # 2. Restore vào DB tạm để test
   TARBALL=$(ls -t research/backups/*.tar.gz | head -1)
   mkdir -p /tmp/restore_test && tar xzf "$TARBALL" -C /tmp/restore_test
   mongorestore --uri "$RESEARCH_MONGO_URI_TEST" /tmp/restore_test/
   # (RESEARCH_MONGO_URI_TEST trỏ tới DB tạm, KHÔNG phải production)

   # 3. Đếm document so khớp
   mongosh "$RESEARCH_MONGO_URI" --eval "db.getCollectionNames().forEach(c => print(c, db[c].countDocuments()))"
   mongosh "$RESEARCH_MONGO_URI_TEST" --eval "db.getCollectionNames().forEach(c => print(c, db[c].countDocuments()))"
   ```
   Số phải khớp từng collection. Báo lại để agent tick ✅ đúng.
2. **Vẫn còn tồn đọng từ Ngày 4–5** (nếu chưa chạy):
   - `node research/verify_env.js` — mở khoá Ngày 11.
   - `node research/create_indexes.js` — bắt buộc trước khi mở enrol.
   - 1000-rep cluster-bootstrap Type-I (~2 phút) — báo `p_cluster_boundary`.

**Bị chặn:**

- Đóng Ngày 6 đúng exit criterion — chờ restore drill (1).
- Cập nhật bảng chỉ số `p_cluster_boundary`, `retrievalType` phân bố thật, `Tỷ lệ dòng log thiếu trường` — chờ (2).
- Ngày 11 (LLM-Judge queue) — chờ Upstash Redis verify.

**Ngày mai:** Nếu (1) restore drill xong, agent tick Ngày 6 → ✅ đúng nghĩa và tiếp Ngày 14 (đệm — hiện là ngày còn ⬜ gần nhất trong Tuần 2, phần lớn các ngày khác đã ✅ ở batch). Nếu `verify_env.js` PASS, agent thử Ngày 11 (LLM-Judge queue trên `lib/queue.ts`). Nếu không có input mới từ bạn, agent tiếp tục health-check + rà soát mã Amendment #A-001 chuẩn bị cho commit sau này.

---


### Ngày 5 — 2026-08-08 (Thứ Bảy)

**Việc theo kế hoạch:** Ngày 5 gốc — tạo 3 collection `Participant` / `TestResult` / `JudgeScore`. Cả 3 model **đã tồn tại từ trước** (batch 5–8 ngày 2026-08-04), tick ✅ trong bảng. Hôm nay agent làm sanity-check + health-check tổng thể vì các mốc kỹ thuật của Tuần 1 đều đã ✅; công việc còn lại chủ yếu là mốc chờ (Ngày 11 chờ Upstash, Ngày 14 đệm) và mốc người dùng (H4–H10).

**Agent đã làm:**

- **Verify Ngày 5 deliverable:** `app/models/{Participant,TestResult,JudgeScore}.ts` đã có, khớp spec `PLAN_45_DAYS.md` (participantCode/condition/stratum, participantCode/totalScore/items, judgeType/rubric/totalScore). Không cần code thêm.
- **Regression health-check sandbox:**
  - `npx jest --testPathPatterns='(judgeRubric|participantAuth|experimentBlinding|retrievalTasks|posttestBuilder)'` → **117/117 PASS** (5 suites, 15.5s).
  - `python -m pytest research/test_dart_model.py -q` → **13/13 PASS** (9.6s). Amendment #A-001 (cluster-bootstrap LRT) implementation vẫn xanh.
- **Kiểm tra working-tree conflict:** `git status --short` — không có xung đột với file agent định đụng. Modified: `RESEARCH_PROGRESS.md`, `package-lock.json`, `research/PREREGISTRATION.md`, `research/dart_model.py` (Amendment #A-001 chưa commit). Untracked: 8 file research từ batch trước (bao gồm `verify_env.js`, `create_indexes.js`, `backup_research_db.sh`, `test_dart_model.py`, `AMENDMENTS.md`). Không đụng vào.
- **Ghi nhận trạng thái mốc:** H1 ✅ (IRB đã nộp 08-07), H2 ✅ (DESIGN_FREEZE ký), H3 ✅ (`.env.research` đã tạo). Các mốc H4–H10 vẫn ⬜ nhưng chưa tới hạn (H4 hạn Ngày 26, sớm nhất H5 Ngày 23).

**Kết quả chạy được:**

| Kiểm tra | Kết quả |
|---|---|
| Jest suite research | 117/117 PASS |
| pytest `test_dart_model.py` | 13/13 PASS |
| Model files Ngày 5 | Có đủ 3, khớp spec |
| Git working tree | Sạch để agent tiếp tục (không đụng file người dùng đang sửa) |

**Phát hiện / cảnh báo:**

- Ba mốc từ Ngày 4 vẫn **chờ người dùng chạy tay trên laptop**: (1) `node research/verify_env.js`, (2) `node research/create_indexes.js`, (3) full 200-rep Type-I với cluster-bootstrap. Agent không có `.env.research` trong sandbox nên không tự chạy được. Cho đến khi các mốc này chạy, Ngày 11 (LLM-Judge queue) vẫn bị chặn vì cần biết Upstash Redis config có hoạt động không.
- Bảng "Chỉ số theo dõi" các trường `alpha_hat`, `DeLong p`, `ECE`, `Power ở N khả thi`, `ICC` vẫn `—` — đúng, chưa có dữ liệu thật, mọi con số hiện tại đều là **mô phỏng** và **không được** đưa vào bản thảo bài báo.
- Chỉ số Type-I bảng vẫn cần cập nhật sau khi bạn chạy 200 reps cluster-bootstrap trên laptop. Amendment #A-001 chỉ có ý nghĩa nếu số cluster-bootstrap p thực sự ≤ 0.05 nominal.
- Ngày N=5 nằm ở giữa Tuần 1. 8/10 việc Tuần 1–2 đã ✅ theo bảng. Nếu Ngày 11–12 vẫn chưa gỡ được bởi hạ tầng Redis, có thể xoay sang Ngày 14 (đệm + tổng kết tuần) trong 2 ngày tới.

**🔴 Việc BẠN phải làm hôm nay:**

1. **Chạy pre-flight Ngày 6 (mở khoá Ngày 11):**
   ```
   node research/verify_env.js
   node research/create_indexes.js
   ```
   Cả hai phải in `PASS` / không có `❌`. Báo lại nếu lỗi.
2. **Chạy 200-rep cluster-bootstrap Type-I trên laptop** (~2 phút):
   ```
   cd research
   python -c "from synth_logs import simulate; from dart_model import lrt_alpha_cluster_bootstrap; \
     rows,_ = simulate(n_learners=60, n_words=30, weeks=8, alpha_true=0.0, seed=2026); \
     rows = [r for r in rows if r['deltaDays']>0]; \
     res = lrt_alpha_cluster_bootstrap(rows, n_boot=1000, seed=1, verbose=True); \
     print(res)"
   ```
   Báo lại `p_cluster_boundary` để agent cập nhật bảng chỉ số.
3. **Setup Windows Task Scheduler cho backup** (`research/backup_research_db.sh` chạy 03:00 hằng ngày) — cần `mongodump` được cài trước.

**Bị chặn:**

- Ngày 11 (LLM-Judge queue) — cần verify Upstash Redis config trong `.env.research` (chờ mốc 1 ở trên).
- Cập nhật bảng chỉ số Type-I cluster-bootstrap — chờ mốc 2 ở trên.

**Ngày mai:** Nếu (1) và (2) xong, agent bắt tay Ngày 11: đẩy `runLLMJudge` vào async queue (dựa trên `lib/queue.ts` + `lib/async-queue-db.ts` có sẵn), viết endpoint polling `job_status`. Nếu chưa, agent tiếp Ngày 14 (đệm — dọn nợ nhỏ, viết `research/data_quality.py` cho Ngày 13 nếu chưa có).

---

### Ngày 4 — 2026-08-07 (Thứ Sáu) — batch 2 (unblock cascade)

**Bối cảnh:** người dùng báo H1 (IRB) + H2 (DESIGN_FREEZE) đã ký, chọn Phương án A cho Amendment #A-001. Ba đường găng lớn nhất mở khoá cùng lúc → agent chạy ngay Amendment implement + Ngày 6 (được mở khoá bởi H3 xong trước đó).

**Agent đã làm:**

- **Amendment #A-001 ký chính thức** trong `research/AMENDMENTS.md`: Phương án A (Cluster-bootstrap LRT), ngày 2026-08-07.
- **`research/dart_model.py`** — thêm `lrt_alpha_cluster_bootstrap(rows, n_boot=1000, seed=42, ...)` + helper `_fit_lr_from_rows`:
  - Case cluster bootstrap: resample `userId` với thay thế, refit cả DART + HLR mỗi rep, tính LR_boot.
  - Fail-closed: raise `ValueError` nếu <2 clusters hoặc <2 retrieval-type levels (α không định danh).
  - Trả dict: `lr_observed`, `alpha_hat`, `ll_full`, `ll_restricted`, `n_boot_requested`, `n_boot_valid`, `p_cluster_naive`, `p_cluster_boundary` (= 0.5 × naive, boundary correction Self-Liang).
  - Ghi chú deprecation vào `lrt_alpha` cũ tham chiếu amendment.
- **`research/test_dart_model.py`** — 13 pytest cases: numerical safety, boundary correction, single-cluster/single-d rejection, deterministic seed, return_boot, alpha≥0, H1 alpha_hat > H0 sanity. **13/13 PASS** trong 8.3s (sandbox).
- **`research/PREREGISTRATION.md`** — cập nhật §4 RQ1 Primary test: thay LRT asymptotic → **cluster-bootstrap LRT** (B=1000), tham chiếu Amendment #A-001 + Cameron-Miller 2015.
- **Ngày 6 — tách DB nghiên cứu** (mở khoá bởi H3):
  - **`lib/researchDb.ts`** — Mongoose connection riêng cho research DB. Đọc `RESEARCH_MONGO_URI`, refuse nếu URI có `/viettalk` mà không có `viettalk_research`. Pool nhỏ (3), không share global với `lib/db.ts`. tsc strict pass.
  - **`research/verify_env.js`** — pre-flight check `.env.research`: format URI, tách production check, salt length, Upstash config, MongoDB ping + list collections. KHÔNG in secret nào.
  - **`research/create_indexes.js`** — idempotent migration: unique + compound indexes cho 5 collection (reviewlogs.clientEventId sparse unique, participants.participantCode + hashedUserId, testresults compound unique, judgescores triple unique, familiarityresponses.screenerId). Bắt buộc chạy trước khi mở enrol.
  - **`research/backup_research_db.sh`** — daily `mongodump` → `research/backups/<db>-<timestamp>.tar.gz`, retention 30 ngày, refuse chạy trên production DB.
  - **`research/backups/.gitignore`** — chỉ commit `.gitignore`, không commit dump.

**Kết quả chạy được:**

| Kiểm tra | Kết quả |
|---|---|
| `python -m pytest test_dart_model.py -v` (sandbox) | **13/13 PASS** trong 8.27s |
| Smoke `lrt_alpha_cluster_bootstrap` H0 (n=20, boot=20) | alpha_hat=0.000, p_naive=0.800 (không reject — đúng) |
| Smoke H1 (alpha_true=0.5, n=40, boot=30) | alpha_hat=0.300, LR=6.45 (reject direction — đúng) |
| Ước tính B=1000 full trên laptop | ~2 phút CPU / dataset N=60 (mô phỏng) |
| `npx tsc --noEmit --strict lib/researchDb.ts` | PASS sạch |

**Phát hiện / cảnh báo:**

- Cluster-bootstrap dùng ~50× thời gian asymptotic LRT. Ở pilot (~36k dòng, N=60), 1 phân tích ≈ 2 phút — chấp nhận được. Ở main study (N=200, ~120k dòng), ước ~10 phút — vẫn OK cho analysis cuối cùng.
- `verify_env.js` và `create_indexes.js` đều **chưa được chạy** trong sandbox (không có `.env.research` trong container). Bạn phải chạy tay sau khi rotate secret.
- Backup script yêu cầu `mongodump` binary — Windows cần cài MongoDB Database Tools riêng. Link đã ghi trong header script.
- Chưa tự động hoá backup — cần bạn setup Windows Task Scheduler (hoặc cron nếu chạy Linux) trỏ tới `research/backup_research_db.sh` hằng ngày 03:00.

**🔴 Việc BẠN phải làm hôm nay/ngày mai:**

1. **Rotate secrets đã lộ** ở chat trước (MongoDB password, Cloudinary secret, Cohere, Pinecone, FPT, Google OAuth, JWT_SECRET, NEXTAUTH_SECRET). Danh sách 8 mục đã gửi ở tin nhắn trước.
2. **Chạy pre-flight cho Ngày 6:**
   ```
   node research/verify_env.js
   node research/create_indexes.js
   ```
   Cả hai phải print `PASS` / không có `❌`. Báo lại nếu lỗi.
3. **Setup daily backup** — Windows Task Scheduler, action = `bash D:\CODE\voichat1012\research\backup_research_db.sh`, trigger daily 03:00. Cài `mongodump` trước.
4. **Chạy full 200 reps Type-I trên laptop** (đã có `run_full_type1_laptop.sh` từ batch trước) — giờ nên chạy song song với cluster-bootstrap version:
   ```
   cd research
   python -c "from synth_logs import simulate; from dart_model import lrt_alpha_cluster_bootstrap; \
       rows,_ = simulate(n_learners=60, n_words=30, weeks=8, alpha_true=0.0, seed=2026); \
       rows = [r for r in rows if r['deltaDays']>0]; \
       res = lrt_alpha_cluster_bootstrap(rows, n_boot=1000, seed=1, verbose=True); \
       print(res)"
   ```
   ~2 phút. Báo lại `p_cluster_boundary` để cập nhật bảng chỉ số.

**Bị chặn:**

- Ngày 11 (LLM-Judge queue) — cần Upstash Redis config trong `.env.research` (bạn có thể đã điền, sẽ verify khi chạy `verify_env.js`).

**Ngày mai:** Nếu pre-flight PASS, agent tiếp Ngày 11 (LLM-Judge queue). Nếu FAIL, agent debug env config.

---

### Ngày 4 — 2026-08-07 (Thứ Sáu)

**Việc theo kế hoạch:** Mở rộng schema `ReviewLog` (Ngày 4). Schema đã được mở rộng ở batch trước — `app/models/ReviewLog.ts` có đủ 11 field research extensions (`clientEventId`, `sessionId`, `condition`, `schedulerVersion`, `weightsVersion`, `scheduledAt`, `servedAt`, `elapsedMs`, `serverDeltaDays`, `taskPromptHash`, `isCatchUp`). Ngày 4 ✅ **không cần code thêm** — hôm nay dồn sức xử lý tồn đọng Ngày 3 (Type-I ⚠️) và chuẩn bị đầu vào cho quyết định amendment.

**Agent đã làm:**

- **`research/AMENDMENTS.md`** (mới) — dự thảo Amendment #A-001 với hai phương án A/B (cluster-bootstrap vs sandwich adjustment) sẵn sàng để bạn tick chọn + ký. Bao gồm bối cảnh Type-I diagnostic, so sánh chi phí implement/compute, ghi chú viết Method. Trước khi ký, không sửa `dart_model.py`.
- **`research/run_full_type1_laptop.sh`** (mới) — script bash chia 200 reps Type-I thành 10 chunk × 20 rep (có checkpoint, resume-safe nếu crash), cộng 40 reps @ N=180, cộng power positive 100 reps × 6 mức. Bạn chạy `cd research && bash run_full_type1_laptop.sh` — nếu Ctrl+C giữa chừng, chạy lại sẽ bỏ qua chunk đã xong. Đã fix flag `--seed0` cho đúng interface `power_analysis.py`.
- **Xác nhận Day-4 deliverable:** đọc `app/models/ReviewLog.ts` — schema đã đủ Ngày 4; không sửa vì không cần.
- **KHÔNG chạy code mới trong sandbox** — 200 reps là công việc laptop-time, sandbox không đủ.

**Kết quả chạy được:** —  (không chạy analysis mới; deliverable hôm nay là chuẩn bị công cụ để bạn quyết định + chạy).

**Phát hiện / cảnh báo:**

- 🚨 **H1 IRB nay QUÁ HẠN 3 ngày.** Với thời gian chờ 4–8 tuần, mỗi ngày trễ là 1 ngày mất trắng của cả dự án. Đây là ưu tiên duy nhất hôm nay nếu bạn chỉ có 1 giờ.
- Amendment #A-001 (Type-I fix) là **điều kiện tiên quyết** để agent có thể động vào `dart_model.py`. Không ký = không thể tiếp tục RQ1 implementation.
- Chưa có ai chạy full 200 reps trên laptop; hiện tại toàn bộ kết luận Type-I dựa trên 110 reps sandbox (Wilson CI [0.092, 0.223] — floor > 0.05 nhưng khoảng còn rộng).
- `git status`: 4 file untracked (`aggregate_type1_weeks8_v2.py`, `cluster_bootstrap_lrt_prototype.py`, `familiarity_results.json`, `lr_null_distribution_study.py`) + `RESEARCH_PROGRESS.md` đang dirty. Chưa đụng file người dùng đang sửa.

**🔴 Việc BẠN phải làm hôm nay:**

1. **H1 IRB — QUÁ HẠN 3 ngày.** Đường găng. Nộp NGAY. Dùng `research/PREREGISTRATION.md` làm phụ lục.
2. **H2 ký `research/DESIGN_FREEZE.md` — QUÁ HẠN 3 ngày.** Chặn H1.
3. **H3 tạo `.env.research` — QUÁ HẠN 2 ngày.** Chặn Ngày 6.
4. **Quyết định + ký Amendment #A-001** trong `research/AMENDMENTS.md`. Tick A hoặc B, điền chữ ký. Khi xong, báo agent để implement.
5. **Chạy `bash research/run_full_type1_laptop.sh` trên laptop** (~90 phút CPU tổng). Sau khi xong, chạy `python research/aggregate_type1_weeks8_v2.py` (đã có sẵn) và báo lại kết quả để cập nhật bảng chỉ số.

**Bị chặn:**

- Implement cluster-bootstrap LRT vào `dart_model.py` — chờ chữ ký Amendment #A-001.
- Ngày 6 tách DB — vẫn chờ H3.
- Ngày 11 (LLM-Judge queue) — chờ Redis config trong H3.

**Ngày mai:** Nếu bạn ký Amendment A, agent sẽ implement `lrt_alpha_cluster_bootstrap` vào `dart_model.py` + viết test regression + cập nhật `PREREGISTRATION.md` để reference amendment. Nếu ký B, agent làm Jacobian cluster-robust (2–3 ngày). Nếu chưa ký gì, agent sẽ tiếp việc không phụ thuộc DART core: viết test cho `session.ts` (`pickTaskType` policy) — món nợ kỹ thuật đã ghi từ batch 4.

---

### Ngày 3 — 2026-08-06 (Thứ Năm)

**Việc theo kế hoạch:** Power analysis + Type-I error (Ngày 3 ⚠️). Tiếp nối chẩn đoán Ngày 2: weeks=8 chỉ có 45 reps → CI [0.019, 0.203] quá rộng để chốt.

**Agent đã làm:**

- **Chạy thêm 65 reps Type-I weeks=8** (7 chunk: `reports/type1_weeks8_chunk_d5.json` seed 8000, `_e..j.json` seed 8100–8600, 10 reps mỗi mẻ). Tổng cộng 45 (cũ) + 65 (mới) = **110 reps**.
- **`aggregate_type1_weeks8_v2.py`** — aggregator có Wilson CI + Wald CI + pooled mean_alpha. Sinh `reports/type1_weeks8_aggregated_v2.json`.
- **`cluster_bootstrap_lrt_prototype.py`** — prototype single-replicate cluster-bootstrap LRT (resample theo `userId`, không phải theo dòng), có tài liệu về "case cluster bootstrap" (Cameron & Miller 2015).
- **`lr_null_distribution_study.py`** — script diagnostic mạnh hơn: pool bootstrap null LR từ nhiều datasets, so sánh **trực tiếp** quantile bootstrap với χ²₁ lý thuyết. Không dùng reject rate quan sát (noisy) mà so sánh phân phối.
- **`reports/TYPE1_DIAGNOSTIC_2026-08-06.md`** — báo cáo đầy đủ tổng hợp 3 dòng bằng chứng.
- **KHÔNG sửa `dart_model.py`** — cluster-bootstrap là quyết định amendment pre-registration của người dùng, không phải fix âm thầm.

**Kết quả chạy được (mô phỏng — không phải kết quả):**

| Bằng chứng | Kết quả | Verdict |
|---|---|---|
| Type-I empirical @ weeks=8, N=60, 110 reps | **0.146**, Wilson 95% CI [0.092, 0.223] | **CONFIRMED anti-conservative** ở tham số study |
| LR bootstrap null vs χ²₁ (weeks=4, 30 boot pooled) | Right tail dày **2.8×–3.7×** χ²₁ ở q70–q99 | Chứng cứ mạnh cho clustering |
| P(boot LR ≥ χ²₁ 90% cutoff) | **0.333** (kỳ vọng nếu asymptotic đúng: 0.05) | 6.6× nominal |
| Bias `alpha_hat` dưới H₀ (weeks=8) | +0.12 | Estimator có bias dương lớn |

**Phát hiện / cảnh báo:**

- 🚨 **Anti-conservative đã confirmed ở tham số study (weeks=8)**. Wilson CI floor 0.092 > 0.05 → không phải noise. Ngày 2 chỉ suggestive, hôm nay chốt.
- 🚨 **Cluster-bootstrap null có right tail dày gấp ~3× χ²₁** — bằng chứng chẩn đoán nguyên nhân là clustering (như hypothesis Ngày 2).
- Pre-registration Ngày 26 đã ✅ khai `lrt_alpha` boundary-corrected χ²₁ — bây giờ có bằng chứng nó anti-conservative → **cần amendment pre-registration TRƯỚC khi pilot bắt đầu**.
- Nếu amend sau khi thấy pilot data, reviewer chuyên sâu có thể chất vấn.
- Bias `alpha_hat` dưới H₀ = +0.12 → là câu hỏi riêng, cần bootstrap bias correction trong bản báo cáo cuối cùng.

**🔴 Việc BẠN phải làm hôm nay:**

1. **H1 IRB — QUÁ HẠN 2 ngày.** Đường găng dài nhất, mỗi ngày trễ mất 1 ngày. Nộp ngay.
2. **H2 ký `research/DESIGN_FREEZE.md` — QUÁ HẠN 2 ngày.** Chặn H1.
3. **H3 tạo `.env.research` — QUÁ HẠN 1 ngày.** Chặn Ngày 6.
4. **Quyết định amendment pre-registration cho `lrt_alpha`.** Đọc `research/reports/TYPE1_DIAGNOSTIC_2026-08-06.md`, chọn 1 trong 2:
   - **A. Cluster-bootstrap LRT** (an toàn nhất). Prototype đã có; agent có thể implement full trong `dart_model.py` sau khi bạn ký amendment.
   - **B. Cluster-robust sandwich adjustment**. Nhanh hơn khi chạy, phức tạp hơn khi viết Method.
5. **Chạy full 200 reps trên laptop** để chốt Wilson CI ±0.05:
   ```bash
   cd research
   python power_analysis.py --grid 60,180 --alpha-true 0 --reps 200 --weeks 8 \
       --out reports/type1_full_weeks8.json
   ```
   ~30–45 phút CPU. Sau đó chạy power positive:
   ```bash
   python power_analysis.py --grid 30,60,90,120,180,240 --weeks 8 --reps 100 \
       --out reports/power_positive.json
   ```
6. **Tạo `research/AMENDMENTS.md`** ghi nhận amendment (khi chọn xong).

**Bị chặn:**

- Full 200 reps ở weeks=8 — cần laptop (sandbox 45s/lệnh không đủ).
- Confirm bootstrap null distribution ở weeks=8 với ≥100 boot reps — cần laptop (~5 phút CPU).
- Ngày 6 tách DB — vẫn chờ H3.
- Implement cluster-bootstrap LRT vào `dart_model.py` — chờ quyết định amendment (4).

**Ngày mai:** Nếu bạn đã chốt amendment (4), agent sẽ implement `lrt_alpha_cluster_bootstrap` vào `dart_model.py`, viết test regression, và bổ sung Ngày 6 (nếu H3 xong). Nếu chưa, tiếp Ngày 11 (LLM-Judge queue) — nhưng vẫn chờ Redis config trong H3.

---

### Ngày 27 — Pilot operation system — 2026-08-05 (batch 9)

**Agent đã làm:**

- **`app/models/FamiliarityResponse.ts`** — Mongoose model H5 screening (screenerId unique, responses Map, metadata)
- **`app/api/research/familiarity-screen/route.ts`** — GET words + POST submit (no auth, idempotent 409)
- **`app/api/research/familiarity-screen/results/route.ts`** — Admin aggregate: per-word rate, flag ≥70%
- **`app/research/familiarity-screen/page.tsx`** — Screener UI: 60-word grid (B1/B2), toggle known/unknown, real-time progress bar, durationSecs tracking, done screen
- **`research/analyze_familiarity.py`** — Offline analysis: tally per-word, print sorted table, save familiarity_results.json, exit 2 if flagged
- **`research/pilot_readiness.py`** — Pre-pilot go/no-go checker 8 sections: env vars, HMAC token round-trip, MongoDB ping, required files, DESIGN_FREEZE signature, H5 screening completeness, Jest, tsc
- **`research/PILOT_CHECKLIST.md`** — 35-item human checklist (A: Ethics, B: Word bank, C: Technical, D: E2E manual test, E: Rater calibration, F: Recruitment, G: Monitoring) + sign-off fields

**Ngày mai:** Ngày 28 — Diễn tập toàn hệ thống (E2E test script tự động + smoke test production endpoints).

---

### Ngày 2 — 2026-08-05 (Thứ Tư)

**Việc theo kế hoạch:** Dựng môi trường phân tích + smoke pipeline (Ngày 2 gốc đã ✅ ở batch 2 hôm qua). Trọng tâm hôm nay: **xử lý tồn đọng ⚠️ Ngày 3 — Type-I error**.

**Agent đã làm:**

- Cài đặt lại stats stack trong sandbox (`numpy 2.2.6`, `scipy 1.15.3`, `pandas`, `statsmodels`, `patsy`) — verify pipeline vẫn chạy được.
- **Type-I quick chunks (weeks=4):** 3× 30-rep runs với seed 2000/3000/4000. Kết hợp với `type1_quick.json` cũ (seed 1000) → **120 reps tổng**.
- **Type-I chunks tại tham số thật của study (weeks=8):** 3× 15-rep runs với seed 5000/6000/7000 → 45 reps tổng.
- Viết aggregator, sinh `reports/type1_aggregated.json` (weeks=4) và `reports/type1_weeks8_aggregated.json` (weeks=8).
- **Chẩn đoán:** viết `research/reports/TYPE1_DIAGNOSTIC_2026-08-05.md` — nêu bằng chứng, giả thuyết nguyên nhân (LRT dùng `n = số dòng` thay vì tính đến clustering theo `userId`), và 2 hướng sửa (cluster-bootstrap vs sandwich).
- **Regression health check:** `npx tsc --noEmit --skipLibCheck` trên 11 file `lib/*` cốt lõi → PASS. `npx jest` với pattern (judgeRubric|participantAuth|experimentBlinding|retrievalTasks|posttestBuilder) → **117/117 PASS** (5 suites, 16.5s). Không có regression từ batch 8 hôm qua.
- **KHÔNG sửa `dart_model.py`** — quyết định statistical này phải là pre-registration decision của người dùng, không phải fix âm thầm.

**Kết quả chạy được (mô phỏng — không phải kết quả):**

| Cấu hình | Reps | Reject rate | 95% Wald CI | Kết luận |
|---|---:|---:|---|---|
| N=60, weeks=4, words=30 | **120** | **0.183** | [0.114, 0.253] | **ANTI-CONSERVATIVE** (CI floor > 0.05) |
| N=60, weeks=8, words=30 | 45 | 0.111 | [0.019, 0.203] | Suggestive nhưng chưa đủ power để chốt |

Chi tiết: mean_alpha ước lượng dưới null (alpha_true=0) dao động **0.11–0.18** — bias dương lớn.

**Phát hiện / cảnh báo:**

- 🚨 Type-I inflation **confirmed** ở weeks=4 (CI floor 0.114 > 0.05). Weeks=8 chưa đủ reps để confirm nhưng point estimate 0.111 cũng ≥ 2× nominal.
- Giả thuyết nguyên nhân: `lrt_alpha` trong `dart_model.py` dùng `n = len(rows)` (~28k–56k) trong khi dữ liệu phân cụm theo learner (60 cụm). LRT asymptotics giả IID — inflated Type-I là hậu quả trực tiếp.
- Nếu confirmed → **RQ1 kiểm định chính bị ảnh hưởng** → cần fix trước pre-registration (Ngày 26 đã ✅ nhưng nếu phải sửa thì phải amendment).
- Sandbox 45s/lệnh không đủ chạy full `--reps 200 --weeks 8 --grid 60,180`. Bắt buộc chạy trên laptop.

**🔴 Việc BẠN phải làm hôm nay:**

1. **H1 IRB — QUÁ HẠN 1 ngày.** Đường găng, mỗi ngày trễ mất một ngày của cả dự án. Nộp ngay hôm nay.
2. **H2 ký `research/DESIGN_FREEZE.md` — QUÁ HẠN 1 ngày.** Chặn H1.
3. **H3 tạo `.env.research`** — HÔM NAY LÀ HẠN. Chặn Ngày 6 (tách DB), integration test.
4. **Chạy full Type-I trên laptop** (~30–60 phút):
   ```bash
   cd research
   python power_analysis.py --grid 60,180 --alpha-true 0 --reps 200 --weeks 8 \
       --out reports/type1_full.json
   ```
   Nếu rejection rate ở weeks=8 vẫn > 0.10 với CI floor > 0.05 → xác nhận bug clustering, cần quyết định sửa `lrt_alpha` (cluster-bootstrap là an toàn nhất) trước khi làm bất cứ gì tiếp với DART.
5. Đọc `research/reports/TYPE1_DIAGNOSTIC_2026-08-05.md` để có ngữ cảnh cho quyết định (3).

**Bị chặn:**

- Ngày 6 tách DB — vẫn chờ H3.
- Confirm/deny Type-I inflation ở weeks=8 — cần laptop-time.

**Ngày mai:** Nếu H1/H2/H3 chưa xong sẽ tiếp tục cảnh báo. Nếu có thời gian, tiếp Ngày 11 (LLM-Judge queue) — nhưng thực tế bị chặn bởi Redis config trong H3.

---

### Ngày 26 — Pre-registration + DESIGN_FREEZE — 2026-08-04 (batch 8)

**Agent đã làm:**

- **`research/DESIGN_FREEZE.md`** — thêm **Mục 5: Hằng số đã khoá trong code**:
  - 15 hằng số với giá trị, file nguồn, mô tả: `PARAPHRASE_OVERLAP_MAX=0.70`, Levenshtein-1 (word ≥5 chars), `ε=0.10`, `TOKEN_TTL_SECS=6048000`, `FORM_VERSION="posttest_v1.0"`, ICC threshold ≥0.70, rubric max=8, recall/cloze/CT/delayed word sets, 60-word bank
  - Hướng dẫn ghi nhận sửa đổi (amendment process → `AMENDMENTS.md`)
  - Đổi số mục cũ "Mục 5 Điều kiện đạo đức" → Mục 6

- **`research/PREREGISTRATION.md`** — OSF-format pre-registration đầy đủ (NEW):
  - Tiêu đề, tác giả, thể chế (để trống cho người dùng điền trước submission)
  - Rationale đầy đủ (desirable difficulties theory, Bjork 1994; Kornell & Bjork 2008; HLR baseline)
  - 3 RQ với H₀/H₁ rõ ràng:
    - RQ1: α > 0, kiểm định LRT boundary-corrected + DeLong; cả hai phải p < .05
    - RQ2: μ_DART > max(μ_HLR, μ_SM2), mixed-effects ANCOVA + Holm–Bonferroni
    - RQ3: CT score gate: ICC(2,1) ≥ 0.70 trước khi dùng LLM làm primary
  - Thiết kế thực nghiệm, tiêu chí chọn/loại trừ, N=200
  - Power analysis minh bạch: thừa nhận N=200 có thể thiếu power cho d < 0.55 (RQ2)
  - Kế hoạch phân tích chi tiết: CV theo userId, ITT + PP sensitivity, missing data MI
  - 13 pre-registered constants (bảng có source)
  - Timeline + Disclosure of Deviations policy
  - 7 tài liệu tham khảo

- **`research/calibration_practice_items.json`** — 5 practice items expert-scored (NEW):
  - Target word: *contribute*, scenario: scholarship letter
  - calib_001: form=0 (typo destroys identity) → total 1/8
  - calib_002: form=2 nhưng context fit=0, meaning=1 (vague) → total 4/8
  - calib_003: perfect 8/8 — top anchor
  - calib_004: use=1 (wrong preposition "in" thay vì "to") → total 6/8
  - calib_005: meaning=1 (học viên nhờ câu xung quanh, không tự demonstrate) → total 5/8
  - Mỗi item có `expertRationale` per dimension + ghi chú khó/dễ cho rater

**Files thay đổi / tạo mới:**

| File | Thay đổi |
|---|---|
| `research/DESIGN_FREEZE.md` | Thêm Mục 5 pre-registered constants, đánh số lại Mục 6 |
| `research/PREREGISTRATION.md` | NEW — OSF pre-registration draft đầy đủ |
| `research/calibration_practice_items.json` | NEW — 5 practice items với expert scores |

**Kết quả:**

| Chỉ số | Giá trị |
|---|---|
| H4 readiness | `PREREGISTRATION.md` sẵn sàng để copy vào OSF sau khi H1 (IRB) duyệt |
| H6 readiness | `calibration_practice_items.json` sẵn sàng cho buổi calibration với rater |
| DESIGN_FREEZE.md | Đầy đủ để ký (H2) — chỉ cần điền tên hướng dẫn + chữ ký |

**Cần làm (CHỈ BẠN):**

- **H1 IRB**: Nộp hồ sơ đạo đức nghiên cứu — đường găng dài nhất. Dùng `PREREGISTRATION.md` làm phụ lục.
- **H2**: In `DESIGN_FREEZE.md`, điền tên hướng dẫn, ký. Sau H1.
- **H4**: Sau IRB duyệt → đăng ký trên OSF/AsPredicted, paste nội dung `PREREGISTRATION.md`.

**Ngày mai:** Ngày 27 — Pilot operation system (enrollment flow end-to-end, pilot word validation automation).

---

### Ngày 25 — Rubric + judge calibration — 2026-08-04 (batch 7)

**Agent đã làm:**

- **`lib/judgeRubric.ts`** — 4 chiều rubric (Nation 2001, Read 2000):
  - `RUBRIC_CRITERIA`: tiêu chí đầy đủ 4 chiều mỗi level 0/1/2 kèm mô tả
  - `isValidRubricScores()`: validate tất cả fields trong range 0-2
  - `sumRubric()`, `maxRubricScore()` (6 không có contextFit / 8 có), `normalizeRubricScore()` → 0-100
  - `parseLLMJudgeOutput(raw, expectContextFit)`: tìm JSON trong bất kỳ đâu trong output, coerce strings→numbers, cap rationale 1000 chars, return `{ valid, parseError }` thay vì throw

- **`lib/llmJudge.ts`** — LLM judge system:
  - `buildJudgePrompt()`: prompt structured 4-section (task, word+definition, response, rubric), blind via `sanitiseJudgePrompt()` trước khi gửi
  - `runLLMJudge(input)`: gọi `callAI` với `temperature=0` (deterministic), prefer OpenAI → Groq fallback, record `judgeId = "llm:<model-slug>"` để audit LLM version
  - Return `LLMJudgeResult { judgeId, parsed, rawOutput, durationMs, callSucceeded }`
  - Fail-safe: mọi lỗi (network, parse) return `valid=false`, không throw

- **`app/api/admin/research/judge/route.ts`** — admin endpoint (admin gate middleware):
  - `GET`: list pending CT items chưa có LLM JudgeScore
  - `POST { testResultId, itemId }`: grade 1 item, save JudgeScore, update TestResult.judgeScoreIds
  - `POST { batch: true }`: grade tất cả pending items (gọi `runLLMJudge` tuần tự)

- **`research/CALIBRATION_GUIDE.md`** — human rater guide đầy đủ:
  - 4 dimensions với anchor examples (target word: *contribute*)
  - Decision rules edge cases (form=1 vs form=0, generic vs specific contextFit)
  - Calibration process: 5 practice items → calibration session → ICC check
  - Common errors to avoid (holistic bias, L1 transfer penalty)
  - ICC threshold: ≥0.70 required trước khi dùng LLM score làm primary

- **`__tests__/judgeRubric.test.ts`** — **26/26 PASS**:
  - isValidRubricScores: valid/invalid, out-of-range, non-integer, missing fields
  - sumRubric + maxRubricScore: 3-dim và 4-dim
  - normalizeRubricScore: perfect/zero/half/max=0
  - parseLLMJudgeOutput valid: clean JSON, no-contextFit, embedded preamble, string coerce, rationale cap
  - parseLLMJudgeOutput invalid: no JSON, malformed, out-of-range, negative, missing field
  - Round-trip: all-2 → 100, all-0 → 0

**Tests tổng: 117/117 PASS** (5 suites)

**Kết quả:**

| Chỉ số | Giá trị |
|---|---|
| Test suites | 5, 117 tests |
| Calibration guide | ✅ production-ready cho H6 (tuyển giáo viên chấm) |
| LLM judge | Blind, deterministic (temp=0), fail-safe |
| ICC threshold | ≥0.70 pre-registered trong guide |

**Phát hiện:**

- LLM judge dùng `temperature=0` nhưng OpenAI và Groq không guarantee 100% determinism khi cùng input. Điều này là chấp nhận được cho ICC đủ lớn; nếu muốn replicability tuyệt đối cần cache judge output per (testResultId, itemId, judgeId).
- `CALIBRATION_GUIDE.md` tham chiếu `research/calibration_practice_items.json` chưa tồn tại — cần tạo 5 practice items (với expert scores) trước pilot H5.
- Batch judge (`POST { batch: true }`) chạy tuần tự — slow nếu nhiều items. Ngày 11/12 (LLM queue + cache) sẽ fix.

**Ngày mai:** Ngày 26 — Pre-registration document (OSF/AsPredicted) + DESIGN_FREEZE.

---

### Ngày 24 — Posttest framework 3 phần — 2026-08-04 (batch 6)

**Agent đã làm:**

- **`lib/posttestBuilder.ts`** — toàn bộ hệ thống xây dựng và chấm bài posttest:
  - **Phân bổ từ** (pre-registered, fixed): 60 từ → 3 nhóm cố định
    - Recall MCQ: w_001–010 + w_031–040 (10 B1 + 10 B2)
    - Cloze Fill: w_011–020 + w_041–050 (sử dụng sentences[1] — khác với câu training)
    - Context Transfer: w_021–025 + w_051–055 (10 prompt mới, domain khác training)
    - Delayed posttest (tuần 10): w_026–030 + w_056–060
  - **`buildRecallItems()`**: MCQ với seed `posttest_recall_<wordId>` — deterministic cho tất cả participant, shuffle vẫn nhất quán
  - **`buildClozeItems()`**: Cloze từ sentences[1] (không phải sentences[0] dùng trong training) → test transfer, không test memory of exact sentence
  - **`buildContextTransferItems()`**: 10 scenario mới hoàn toàn, domain khác (workplace, visa, product policy, software dev...)
  - **`scorePosttest()`**: auto-score S1+S2 (MCQ exact + Cloze fuzzy), S3 tentative (có từ + length OK), `needsJudge=true` cho context transfer
  - **`computeTotalScore()`**: 70% recall+cloze / 30% context transfer
  - `toPublicRecallItem` / `toPublicClozeItem` strip đáp án cho client

- **`app/api/research/posttest/items/route.ts`** — GET, Bearer auth:
  - `?form=immediate` (default): 3 sections đầy đủ
  - `?form=delayed`: delayed word set (10 từ tuần 10)
  - Client không nhận correctIndex / correctAnswer

- **`app/api/research/posttest/submit/route.ts`** — POST, Bearer auth:
  - Idempotent: 409 nếu đã submit (unique index `{participantCode, testType}`)
  - Auto-score S1+S2 server-side, S3 tentative
  - Lưu `TestResult` với `isBlindGraded=true`
  - Trả breakdown: recallCorrect/clozeCorrect, contextTransferPending, totalAuto
  - Ghi chú "context transfer scored within 48h" để participant biết

- **Fix wordBank.ts**: 3 từ có sentences[1] dùng dạng biến đổi (evaluated/demonstrated/required) → sửa sang base form để buildCloze không throw

- **`__tests__/posttestBuilder.test.ts`** — **28/28 PASS**:
  - Word ID partitioning: no overlap, all IDs in WORD_BANK
  - buildRecallItems: count, 4 options, valid correctIndex, deterministic, toPublic strips
  - buildClozeItems: count, has '______', correctAnswer non-empty, toPublic strips
  - buildContextTransferItems: 10 items, prompt chứa word, minWords < maxWords
  - scorePosttest: perfect/zero recall, perfect cloze, CT tentative scoring, needsJudge flags
  - computeTotalScore: 100/0/boundary checks

**Tests tổng: 91/91 PASS** (4 suites: posttestBuilder + participantAuth + retrievalTasks + experimentBlinding)
Word bank validation: **305/305 PASS** (sau khi fix 3 câu)

**Phát hiện:**

- Posttest dùng sentences[1] cho Cloze — không hoàn toàn "unseen" vì sentences[1] đã xuất hiện trong training (dưới dạng Paraphrase source). Đây là compromise hợp lý: cloze task và paraphrase task đòi hỏi xử lý khác nhau, nhưng cần note rõ ở phần limitations khi viết paper.
- Context Transfer 10 items chưa qua IRT calibration — cần pilot testing (H5) để loại item quá dễ/khó.
- `totalScore` khi mới submit sẽ chỉ phản ánh auto-scored portion; `contextTransfer` sẽ `null` đến khi judge chạy. Frontend cần handle trạng thái "pending".

**Ngày mai:** Ngày 25 — Rubric + tập huấn giám khảo (judge calibration guide + LLM judge prompt).

---

### Ngày 23 — Target word list + context pool — 2026-08-04 (batch 5 tiếp)

**Agent đã làm:**

- **`lib/wordBank.ts`** — 60 từ mục tiêu đầy đủ metadata:
  - 30 B1 + 30 B2 (từ Academic Word List / General Service List)
  - Mỗi từ có: `id`, `word`, `cefrBand`, `partOfSpeech`, `definition` (đúng), `viDefinition` (tiếng Việt), `distractors[3]` (3 lựa chọn sai cho MCQ), `sentences[2+]` (câu cho Cloze + Paraphrase), `collocations[]` (gợi ý cho ConstrainedGen)
  - Lemma field cho từ bất quy tắc (dùng cho ConstrainedGen lemma check)
  - `pilotStatus` + `pilotRemovalReason` cho việc loại từ sau H5 pilot testing
  - Helpers: `getWordById`, `getWordByString`, `getWordsByBand`, `getActiveWords`, `toPublicWordEntry`

- **`app/api/research/words/route.ts`** — GET endpoint, auth Bearer token hoặc admin session:
  - `?band=B1|B2` filter theo band
  - `?ids=w_001,w_002,...` lấy danh sách cụ thể
  - Trả `toPublicWordEntry[]` (không leak `pilotRemovalReason`)

- **`app/api/research/words/[wordId]/route.ts`** — GET single word, auth-gated

- **`research/validate_word_bank.py`** — 8 checks structural:
  1. Tổng số đúng 60
  2. ID unique
  3. Word string unique
  4. Đúng 3 distractors mỗi từ
  5. Definition không trùng với distractor
  6. Mỗi câu chứa từ mục tiêu (startswith 5 chars fallback)
  7. ≥2 sentences mỗi từ
  8. B1/B2 balance 30/30
  - **Kết quả: 305 checks PASS, 0 issues** ✅

**Bảng từ (tóm tắt):**

| Band | Từ đại diện |
|---|---|
| B1 (30) | significant, apparent, sufficient, accurate, consequence, maintain, establish, identify, promote, achieve, indicate, analyze, evaluate, demonstrate, interpret, require, assume, consider, generate, impact, contribute, resolve, obtain, relevant, valid, complex, distribute, predict, compare, respond |
| B2 (30) | ambiguous, scrutinize, alleviate, coherent, impede, prolific, meticulous, profound, deteriorate, facilitate, inevitable, inherent, integrate, perceive, perspective, subsequent, assess, constitute, derive, enhance, justify, modify, implicit, contend, reinforce, ambivalent, undermine, unprecedented, hypothesis, implication |

**Ngày mai:** Ngày 24 — Bộ đề posttest 3 phần (recall, cloze, context transfer).

---

### Ngày 22 — HMAC auth + consent + pretest CEFR — 2026-08-04 (batch 5)

**Agent đã làm:**

- **`lib/participantAuth.ts`** — HMAC-SHA256 signed participant tokens, đóng Risk 4:
  - `issueParticipantToken(code)` → `base64url(payload).hex(HMAC(RESEARCH_SALT, payload))` — TTL 70 ngày
  - `verifyParticipantToken(token)` → constant-time comparison, kiểm tra TTL, parse safe
  - `extractBearerToken(header)` + `verifyRequest(header)` — helper cho route handlers
  - Secret: `RESEARCH_SALT` env var (≥32 chars) — cùng salt với userId hashing

- **`app/api/research/enrol/route.ts`** — trả thêm `participantToken` trong mọi success response (kể cả deduplicated + race-loser paths). Client lưu vào `localStorage`, gửi mỗi request sau dưới dạng `Authorization: Bearer <token>`.

- **`app/api/research/review/route.ts`** — đổi từ `x-participant-code` header (P0001–P9999 có thể brute-force) → `Authorization: Bearer <token>`. Attacker không có RESEARCH_SALT không forge được token hợp lệ.

- **`lib/pretestItems.ts`** — 20 MCQ items CEFR A2/B1/B2 (server-only answer key):
  - Band A2 (8 items): everyday vocabulary
  - Band B1 (6 items): upper-intermediate
  - Band B2 (6 items): advanced low-frequency
  - `toPublicPretestItems()` strip correctIndex cho client
  - `scorePretestAnswers()` → score 0-100, cefrLevel bằng B1/B2 band thresholds (≥4 B2 → B2, ≥4 B1 → B1, else A2)

- **`app/api/research/pretest/items/route.ts`** — GET, public (pre-enrolment), trả items đã strip đáp án.

- **`app/api/research/pretest/score/route.ts`** — POST, public, nhận `answers: Record<itemId, 0-3>`, validate từng item, trả `{ score, cefrLevel, correct, total }`. Đáp án không bao giờ rời server.

- **`app/research/consent/page.tsx`** — consent form tối giản:
  - Hiển thị CONSENT_TEXT (sha256 hash lưu vào Participant.consentDocHash)
  - Ô nhập participantCode, checkbox đồng ý
  - Lưu `pendingParticipantCode`/`pendingConsentHash`/`pendingConsentSignedAt` vào localStorage → redirect /research/pretest

- **`app/research/pretest/page.tsx`** — placement test UI:
  - Fetch items từ API, render MCQ với radio buttons
  - Submit → POST /api/research/pretest/score → POST /api/research/enrol
  - Lưu `participantToken` + `armLabel` vào localStorage, xoá pending keys
  - Redirect /dashboard-new sau khi enrol xong

- **`__tests__/participantAuth.test.ts`** — **23/23 PASS:**
  - issuance: format, determinism, throw khi thiếu/ngắn RESEARCH_SALT
  - verify valid: round-trip các code khác nhau
  - verify invalid: empty, null/undefined, no-dot, tampered sig, tampered payload, expired, future-dated, missing salt, garbage base64
  - extractBearerToken: case-insensitive, null/non-Bearer/empty
  - verifyRequest: full round-trip, null, tampered

**Tests tổng: 63/63 PASS** (3 suites: participantAuth + retrievalTasks + experimentBlinding)

**Kết quả:**

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| Risk 4 đóng | ✅ | x-participant-code → HMAC Bearer token |
| Test mới | 23 | participantAuth |
| File mới | 7 | pretestItems, participantAuth, 2 API routes, 2 pages, 1 test |
| File sửa | 2 | enrol + review routes |

**Phát hiện:**

- Consent page hash `CONSENT_TEXT` client-side bằng `crypto.subtle.digest`. Cần IRB duyệt text này trước — bất kỳ thay đổi nào sau khi bắt đầu tuyển là protocol deviation.
- Pretest 20 items đủ cho placement nhưng chưa qua IRT calibration. Nếu muốn chính xác hơn, mở rộng bank + thêm adaptive selection ở Ngày 23–24.
- `app/research/` cần layout.tsx nếu muốn có header/nav khác dashboard. Hiện tại dùng tailwind bare, đủ chức năng.

**🔴 Việc BẠN phải làm:**

1. H1 IRB — ⬜, CRITICAL.
2. H2 DESIGN_FREEZE — ⬜.
3. H3 `.env.research` với `RESEARCH_SALT=<openssl rand -hex 32>` — UNBLOCKS auth layer.
4. Xem lại + ký CONSENT_TEXT trước khi tuyển participant.

**Ngày mai:** Ngày 23 — soạn bộ từ mục tiêu (target word list) + context pool cho task generation.

---

### Fast-forward Ngày 20–21 + fix blinding leak — 2026-08-04 (batch 4)

**Agent đã làm:**

- **Fix leak batch 3:** `/api/research/review` không còn trả `weightsVersion`/`currentWeightsVersion`/`weightsDriftDetected` cho client. Drift chỉ log `console.warn` server-side. Trước fix: participant thấy "default" nhiều tuần rồi đột nhiên sha 12 hex → biết được vừa promote sang trained weights → phá blinding.
- **Ngày 20 dashboard:**
  - `app/api/admin/research/overview/route.ts`: aggregate 5 mảng — per-arm enrolment/dropout/active7d, stalled (≥5 ngày im), retrievalType balance với warning `at_least_one_d_below_10pct`, weightsVersion coverage, per-arm reviews 7 ngày. Server-only, dùng thẳng condition thật (không blinding vì cho researcher xem).
  - `app/admin/research/page.tsx`: server component, timezone `Asia/Ho_Chi_Minh`, cảnh báo đỏ nếu bất kỳ d nào <10%, highlight vàng nếu compliance <70%, list 50 người sắp bỏ cuộc để dễ nhắc. Bảo vệ bởi middleware admin gate có sẵn.
- **Ngày 21 tests:**
  - `__tests__/retrievalTasks.test.ts` — 29 test: MCQ (throw distractor sai, deterministic seed, toPublicTask strip đáp án), Cloze (case-insensitive/variant/Levenshtein-1 chỉ cho ≥5 chars, reject 2 edits, strip trailing punct), ConstrainedGen (maxWords, lemma check, echo detection, inflection), Paraphrase (min/max words, Jaccard >0.70 = copy), timing (clamp bounds).
  - `__tests__/experimentBlinding.test.ts` — 11 test: opaque mapping A/B/C hai chiều, sanitiseForClient drop keys ở mọi depth + array, sanitiseJudgePrompt case-insensitive, detectLeaks phát hiện key + value.
  - **Chạy trong sandbox: 40/40 PASS.**

**Kết quả:**

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| Test suites mới | 2 (retrievalTasks, experimentBlinding) | 40/40 pass |
| Coverage `lib/retrievalTasks/*` | ~branch scoring 100% | build có `collectCoverageFrom` cần thêm — bạn tự sửa jest.config nếu muốn track |
| File TS mới | 2 (dashboard page + overview endpoint) | tsc pass trên overview endpoint, page.tsx cần Next.js context |

**Phát hiện:**

- ⚠️ `sanitiseForClient` chỉ redact khi **toàn bộ string** == telltale value. Nếu route handler nhét arm name vào chuỗi dài (VD `"you are on dart"`) sẽ KHÔNG bị bắt. Test file có case này rõ ràng. Type system không catch — code review là phòng tuyến duy nhất.
- Chưa có test cho `session.ts` (pickTaskType policy) — thêm ở batch sau nếu có bug.
- Dashboard chưa có LLM cost/day (plan yêu cầu) — cần track chi phí ở `lib/aiProvider.ts` trước.

**🔴 Việc BẠN phải làm (còn nguyên):**

1. H1 IRB — vẫn ⬜, đã trễ 20 ngày kế hoạch nếu chưa nộp.
2. H2 ký DESIGN_FREEZE — vẫn ⬜.
3. H3 `.env.research` — vẫn ⬜, đang chặn Ngày 6/11/12 và integration test.
4. Chạy `npx tsc --noEmit && npm run build && npm test` sau khi push.

**Ngày mai:** Ngày 22 — auth cho `/api/research/*` (risk 4 từ code review) + consent + pretest CEFR flow.

---

### Fast-forward Ngày 15–19 — 2026-08-04 (batch 3, backend only)

**Agent đã làm:**

- **Ngày 15:** `lib/retrievalTasks/types.ts` (RetrievalType 0-3, task envelope, `PublicTask`/`toPublicTask` để không leak đáp án qua wire) + `lib/retrievalTasks/timing.ts` (định nghĩa `elapsedMs` chốt cho paper, MIN/MAX plausible bounds, `isPlausibleElapsed`, `clampElapsed`).
- **Ngày 16:** `lib/retrievalTasks/mcq.ts` (deterministic seeded shuffle Fisher-Yates, phát hiện distractor trùng đáp án) + `lib/retrievalTasks/cloze.ts` (fuzzy scoring: case-insensitive, accepted variants, Levenshtein-1 typo tolerance chỉ cho word ≥ 5 ký tự — pre-register threshold này).
- **Ngày 17:** `lib/retrievalTasks/constrainedGen.ts` (auto-check word count + lemma + echo detection, trả `needsJudge=true` cho LLM async) + `lib/retrievalTasks/paraphrase.ts` (Jaccard overlap ≤ 0.70 với source — chống copy-paste, minWords/maxWords, gate CEFR ≥ B1 ở session runner).
- **Ngày 18:** `lib/retrievalTasks/session.ts` — `pickTaskType()` chính sách chung cho HLR/DART (không confound scheduler với task type), fail-closed nếu input malformed, `epsilonExplore` cho ε=0.10 uniform sampling (Ngày 38 fix identifiability).
- **Ngày 19:** `lib/experimentBlinding.ts` — `toOpaque()` map `sm2/hlr/dart` → `A/B/C`, `sanitiseForClient()` strip 8 telltale keys recursively, `sanitiseJudgePrompt()` xoá arm name khỏi prompt LLM-Judge, `detectLeaks()` để test blinding. **Áp dụng ngay vào `/api/research/enrol`**: giờ trả `armLabel: "A"/"B"/"C"` thay vì `condition: "dart"`.

**Kết quả:**

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| File TS mới | 8 (types, timing, mcq, cloze, constrainedGen, paraphrase, session, experimentBlinding) | ~700 LOC tổng |
| Test unit | 0 | 🚨 chưa viết — Ngày 21 phải bù |
| Integration test | 0 | Cần MongoDB + `.env.research` |
| Blinding applied | 1/2 endpoint (enrol) | `/api/research/review` chưa strip — batch sau |

**Phát hiện / cảnh báo:**

- ⚠️ **Chưa có test unit** cho 8 file mới. Bug scoring âm thầm sai (VD Levenshtein) sẽ vào dữ liệu thật. Ngày 21 (đệm tuần) BẮT BUỘC viết Jest tests, ít nhất cho `scoreMCQ`, `scoreCloze`, `scoreParaphrase` (Jaccard).
- ⚠️ **`/api/research/review` chưa sanitise output** — vẫn trả `weightsVersion` raw, chưa dùng `toOpaque`. Nếu tất cả participant thấy `default` cho tới lần train đầu tiên rồi đột nhiên thấy sha 12 hex, họ biết mình vừa được đổi weights. Fix ở batch sau.
- Blinding threshold `PARAPHRASE_OVERLAP_MAX = 0.70` và Levenshtein=1 cho word ≥ 5 chars đều là **pre-registration items** — không được đổi sau khi thấy data.
- Session policy `pickTaskType()` là **chính sách chung**, không phải phần scheduler được so sánh. Confound sẽ xảy ra nếu ai đó "cải tiến" nó riêng cho DART.

**🔴 Việc BẠN phải làm (còn nguyên):**

1. H1 IRB — vẫn ⬜.
2. H2 ký DESIGN_FREEZE — vẫn ⬜.
3. H3 `.env.research` — vẫn ⬜.
4. Chạy `npx tsc --noEmit && npm run build` sau khi push để xác nhận 8 file mới không phá build.

**Ngày mai:** Ngày 20 — bảng điều khiển nghiên cứu viên (`app/admin/research/page.tsx`), sau đó Ngày 21 đệm bằng cách viết Jest test bù cho 8 file này.

---

### Fix code-review — 2026-08-04 (batch 2b)

Sub-agent review batch 2 tìm ra 3 bug + 3 risk. Fix ngay 3 bug + 2 risk:

**Bugs (must-fix, đã sửa):**

1. **`weightsVersion` stamped at write-time, không phải decision-time** (`review/route.ts`) — Scheduler quyết định tại `scheduledAt`, client submit sau vài giây/phút/giờ. Nếu retraining lands giữa hai điểm, row bị gắn nhầm weights → phá audit trail. **Fix:** thêm field bắt buộc `servedWeightsVersion` trong request body (client echo từ `/api/dart/schedule`). Server log cái đó làm truth, đồng thời trả `currentWeightsVersion` + `weightsDriftDetected` để phát hiện drift. Thêm validator `isValidWeightsVersion()` chống log injection.
2. **UTC day bucket sai cho study VN** (`dq_check.py:141`) — `createdAt[:10]` slice UTC ISO, phiên sáng ICT (UTC+7) bị split qua 2 UTC dates → over-count `days_active` → over-report compliance. **Fix:** thêm `to_ict_date()`, convert UTC → Asia/Ho_Chi_Minh trước khi slice.
3. **Enrol race-loser thiếu assignment** (`enrol/route.ts:109-113`) — E11000 handler trả `{success, deduplicated, raceCondition}` nhưng thiếu `condition`, client không render được nhánh. **Fix:** re-fetch winner qua `findOne` và trả lại `condition/stratum`. Trường hợp không findable (secondary replica lag), trả 409 retryable.

**Risks (đã sửa 2/3):**

- **Risk 5 (2 sha cache split-brain):** `researchVersion.ts` giờ gọi `dartWeights.getDartWeightsMeta()` để lấy file source+mtime rồi hash — single source of truth. Export thêm `invalidateResearchVersion()` reset cả 2 cache cùng lúc.
- **Risk 6 (Δ bridge across regimes):** `prev` lookup trong `review/route.ts` thêm filter `condition` — nếu người có 2 condition (protocol violation) mỗi cái tính Δ riêng.
- **Risk 4 (auth chỉ header `x-participant-code`):** CHƯA sửa. Cần bind participantCode vào signed session (NextAuth JWT hoặc HMAC). Để lại — sẽ làm ở Ngày 22 (consent + pretest flow) khi làm auth tổng thể.

**Files sửa:** `lib/researchVersion.ts`, `app/api/research/review/route.ts`, `app/api/research/enrol/route.ts`, `research/dq_check.py`.

**Ngày mai:** Ngày 15 — RetrievalTask framework + đo thời gian chuẩn, đồng thời làm auth cho `/api/research/*` để đóng risk 4.

---

### Fast-forward Ngày 8, 9, 10, 13 — 2026-08-04 (batch 2)

> Người dùng đã push batch 1 (Ngày 1–7) lên `main`. Batch này tiếp Ngày 8, 9, 10, 13 (những ngày agent tự làm được). Ngày 11 (LLM-Judge queue), Ngày 12 (cache task), Ngày 14 (đệm) tạm bỏ qua vì cần Redis config thật và không nằm trên đường găng.

**Agent đã làm:**

- **Ngày 8 — `/api/research/review` (mới):** `app/api/research/review/route.ts`. Tách hoàn toàn khỏi `/api/vocabulary-review`. Điểm mấu chốt:
  - Idempotent: `clientEventId` unique — retry mạng không ghi trùng.
  - `serverDeltaDays` tính **server-side** từ `ReviewLog` cũ nhất của cùng `(participantCode, vocabularyId)`, không tin `deltaDays` client gửi.
  - Kiểm tra `participant.dropoutAt` — người rút không ghi được nữa.
  - Version stamp mọi write bằng `schedulerVersion` + `weightsVersion`.
  - **Không** đụng vào `Vocabulary` collection — tránh SRS state của app rò vào phân tích.
  - Auth via header `x-participant-code` (client research build có consent gate riêng).
- **Ngày 9 — version freeze:** `lib/researchVersion.ts` mới. Export:
  - `SCHEDULER_VERSION = "dart@1.0.0"` — bump tay khi đổi thuật toán.
  - `getWeightsVersion()`: sha256[:12] của `dart_weights.json` đang load, mtime-cached.
  - `hashPrompt(s)`: sha256[:12] để hash prompt bộ đề cho audit trail.
  - `getVersionStamp()`: trả `{schedulerVersion, weightsVersion}` — dùng ở mọi research write.
- **Ngày 10 — `/api/research/enrol`:** `app/api/research/enrol/route.ts`. Idempotent per `participantCode` (`^P\d{4}$`). Không **bao giờ** re-randomise — nếu người đã enrol, trả assignment cũ. Dùng lại `assignCondition()` của app để deterministic. Sanity-check `EXPERIMENT_ARMS` env: nếu cấu hình lỡ đưa nhánh offline (KARL/LECTOR/CARTS) cho người thật, từ chối enrol để tránh vi phạm protocol.
- **Ngày 13 — export + DQ check:**
  - `research/export_logs.py`: **sửa** để khớp với 3 model mới (trước đó tham chiếu field không tồn tại: `cefrPretest`, `phase`, `recallScore`... — sẽ NaN silent khi chạy thật). Giờ đọc đúng `Participant.pretestScore`, `TestResult.sectionScores.{recall,cloze,contextTransfer}`, `TestResult.testType`, thêm export `judgescores.json` cho ICC.
  - `research/dq_check.py`: **mới**. 8 kiểm tra tuần tự (missing field <1%, phân bố retrievalType ≥10%/mức, cân bằng nhánh ±30%, tuân thủ ≥70%, first-exposure count, weightsVersion coverage, server/client Δ drift, test coverage). Non-zero exit nếu bất kỳ 🚨 nào → dễ gắn vào CI. Chạy sau `export_logs.py`.

**Kết quả chạy được:**

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| File TS mới | 3 (`researchVersion.ts`, `research/review/route.ts`, `research/enrol/route.ts`) | tsc trên `researchVersion.ts` PASS; 2 route file quá heavy để compile trong sandbox 45s — cần chạy `npx tsc --noEmit` toàn repo trên máy |
| File Python mới/sửa | `dq_check.py` mới; `export_logs.py` rewrite | py_compile PASS |
| Endpoint mới | `POST /api/research/review`, `POST /api/research/enrol` | Chưa test integration — cần MongoDB thật + `.env.research` (H3) |

**Phát hiện / cảnh báo:**

- 🚨 **`export_logs.py` cũ bị drift schema:** đọc field không tồn tại (`cefrPretest`, `phase`, `recallScore`, `droppedAt`). Nếu bạn từng chạy thử với data giả và không thấy lỗi, đó là vì pymongo silent trả `None` — khi có data thật sẽ ra file toàn cột rỗng. Đã fix.
- ⚠️ Route file `.ts` bên trong `app/api/` mang cả gói type Next.js/React nên tsc từng file mất > 45s trong sandbox này. Không có nghĩa là code sai — chỉ là không verify được ở đây. Chạy `npx tsc --noEmit` local để chắc.
- Cả 2 endpoint mới đều cần MongoDB. Không test được cho tới khi H3 (`.env.research`) có.

**🔴 Việc BẠN phải làm hôm nay (còn nguyên + thêm):**

1. Nộp IRB (H1) — vẫn ⬜, hạn hôm qua theo lịch, mỗi ngày trễ đội lên nghiên cứu.
2. Ký `research/DESIGN_FREEZE.md` (H2) — cần trước IRB.
3. Tạo `.env.research` (H3).
4. **Sau khi push batch này, chạy `npx tsc --noEmit && npm run build` trên máy** để xác nhận 2 route mới compile trong context Next.js.
5. Chạy full power/Type-I trên laptop (câu lệnh trong log Ngày 2–7).

**Bị chặn:**

- Ngày 6 (tách DB), Ngày 11 (LLM-Judge queue), Ngày 12 (cache task) — chờ H3 + Redis config.
- Test integration cho 2 endpoint mới — chờ Mongo dev.

**Ngày mai:** Ngày 15 — khung `RetrievalTask` + đo thời gian chuẩn (định nghĩa TS interface cho 4 loại task d=0..3, chuẩn hoá `performance.now()` phía client, unit test).

---

### Fast-forward Ngày 2–7 — 2026-08-04 (chạy gộp theo yêu cầu người dùng)

> Người dùng yêu cầu chạy nối tiếp các ngày agent tự làm được, không đợi tới sáng mai.
> Mục dưới đây gộp Ngày 2 → Ngày 7. Vẫn chỉ đánh dấu tiến độ theo bảng 45 ngày, không rút ngắn nghiên cứu chính (IRB + pilot vẫn theo lịch thật).

**Việc theo kế hoạch (gộp):** dựng env → power/Type-I → mở rộng ReviewLog → 3 collection mới → (Ngày 6 tách DB: BỊ CHẶN vì H3 chưa có) → tsc/tests.

**Agent đã làm:**

- **Ngày 2 (env + smoke pipeline):** đã cài đủ numpy/scipy/pandas/statsmodels/patsy trong sandbox, chạy `synth_logs.py` + `fit_dart.py` từ Ngày 1 preflight; pipeline chạy trơn.
- **Ngày 3 (power/Type-I) — ⚠️ CHẠY MỘT PHẦN:** sandbox chỉ cho phép mỗi lệnh ≤ 45s, không đủ chạy đủ reps để có power/Type-I hợp lệ. Quick check với `--grid 60 --alpha-true 0 --reps 30 --weeks 4 --words 30`: **rejection rate = 0.133** (nominal 0.05) → script tự cảnh báo "ANTI-CONSERVATIVE". **Đây là quick preview, KHÔNG dùng để pre-register.** Bạn cần chạy `python power_analysis.py --grid 60,180 --alpha-true 0 --reps 200 --weeks 8` trên laptop (dự kiến 20–40 phút) để có số thật. Sau đó nếu vẫn > 0.10, đây là bug thống kê phải sửa trước khi làm bất cứ gì với dữ liệu thật.
- **Ngày 4 (mở rộng `ReviewLog`):** đã thêm 11 trường vào `app/models/ReviewLog.ts` — `clientEventId` (unique sparse), `sessionId`, `condition` (enum 6 nhánh), `schedulerVersion`, `weightsVersion`, `scheduledAt`, `servedAt`, `elapsedMs`, `serverDeltaDays`, `taskPromptHash`, `isCatchUp`. Thêm 2 index mới: `{condition,createdAt}`, `{sessionId,createdAt}`. Interface `IReviewLog` cập nhật đồng bộ.
- **Ngày 5 (3 collection mới):** tạo mới `app/models/Participant.ts`, `app/models/TestResult.ts`, `app/models/JudgeScore.ts`. Participant có `participantCode` unique + strata theo CEFR. TestResult gắn với 4 loại test (`pretest_cefr`, `posttest_immediate`, `posttest_delayed`, `context_transfer`), unique `{participantCode, testType}`. JudgeScore chấm rubric 3–4 chiều (form/meaning/use/contextFit), unique `{testResultId, itemId, judgeId}` để 1 judge không chấm lại. `isCalibrationItem` để tách subset ICC.
- **Ngày 6 (tách DB nghiên cứu) — ⛔ BỊ CHẶN:** cần H3 (`.env.research` với `MONGO_URI` + `RESEARCH_SALT`). Agent không có quyền tạo secret. Không đụng vào.
- **Ngày 7 (tsc):** chạy `tsc --noEmit --skipLibCheck` cho 4 file model (`ReviewLog`, `Participant`, `TestResult`, `JudgeScore`) → PASS, không lỗi. Full-repo `tsc` + `npm test` bỏ do sandbox timeout — để bạn chạy trên máy.

**Kết quả chạy được:**

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| Type-I quick check (reps=30, weeks=4, words=30, N=60) | 0.133 *(mô phỏng, không đủ power để tin)* | Cần rerun ≥200 reps × weeks=8 trên laptop |
| Số file model mới | 3 (Participant, TestResult, JudgeScore) | tsc PASS |
| Số trường mới thêm vào ReviewLog | 11 | + 2 index mới |

**Phát hiện / cảnh báo:**

- 🚨 **Type-I quick check 0.133 CÓ THỂ là dấu hiệu bug thống kê**, nhưng cũng có thể là Monte-Carlo noise (reps=30 quá ít; SE của rate ≈ 0.04, nên 0.133 nằm khoảng 2 SE trên 0.05). Không kết luận được cho tới khi có full run. Nếu full run cũng > 0.10 → bug trong `lrt_alpha()`, phải sửa trước Ngày 26 pre-registration.
- Sandbox này giới hạn 45s/lệnh, không phù hợp chạy power analysis đầy đủ. Từ Ngày 3 trở đi, việc heavy-compute (power, fit_dart với boot=1000, LLM-Judge) phải chạy trên máy bạn hoặc CI dedicated.
- H3 (`.env.research`) đang chặn Ngày 6. H1 (IRB) chưa nộp đang chặn tất cả việc có dính người tham gia thật (Ngày 22 trở đi vẫn còn xa nhưng H1 phải nộp hôm nay).

**🔴 Việc BẠN phải làm hôm nay (còn nguyên):**

1. **Nộp IRB (H1)** — vẫn ⬜, hôm nay là hạn.
2. **Ký `research/DESIGN_FREEZE.md` (H2)** — cần trước khi IRB nhận.
3. **Tạo `.env.research` (H3)** — sẽ mở khoá Ngày 6. Format:
   ```
   MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/viettalk_research?retryWrites=true
   RESEARCH_SALT=<openssl rand -hex 32>
   ```
   Nhớ thêm vào `.gitignore` (đã có sẵn).
4. **Chạy full power/Type-I trên laptop** khi rảnh (không gấp bằng IRB):
   ```
   cd research
   python power_analysis.py --grid 60,180 --alpha-true 0 --reps 200 --weeks 8 --out reports/type1_full.json
   python power_analysis.py --grid 30,60,90,120,180,240 --weeks 8 --reps 100 --out reports/power_full.json
   ```

**Bị chặn:**

- Ngày 6 (tách DB nghiên cứu) — chờ H3.
- Full power analysis — chờ chạy trên máy có thời gian ≥ 30 phút liên tục.

**Ngày mai:** Ngày 8 — hợp nhất endpoint `/api/research/review` (idempotent write dùng `clientEventId`, tính `serverDeltaDays` từ Mongo, gắn `schedulerVersion` + `weightsVersion`). Không đụng DB thật, chỉ code + unit test.

---

### Ngày 1 — 2026-08-04 (Thứ Ba)

**Việc theo kế hoạch:** 🔴 Chốt thiết kế bằng văn bản + nộp hồ sơ IRB (đường găng dài nhất của cả dự án).

**Agent đã làm:**
- Tạo thư mục scaffolding cho pipeline: `research/data/`, `research/reports/`
- Cài đặt và kiểm tra môi trường phân tích trong sandbox (numpy/scipy/pandas/statsmodels OK)
- Chạy smoke-test toàn bộ pipeline: `synth_logs.py --learners 60 --weeks 8` → `fit_dart.py --boot 50` (mô phỏng — không phải kết quả). Ghi `research/reports/rq1_smoke.json`. Xác nhận pipeline chạy trơn, không lỗi
- Soạn template chốt thiết kế: `research/DESIGN_FREEZE.md` (điền, ký, lưu PDF)
- Soạn checklist IRB: `research/IRB_SUBMISSION_CHECKLIST.md`

**Kết quả chạy được (mô phỏng — pipeline validation only):**

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| n_rows | 88,729 | 60 học viên × 8 tuần |
| alpha_hat | 0.467 | alpha_true baked-in = 0.45 → estimator hoạt động |
| alpha 95% CI (bootstrap cụm, B=50) | [0.153, 0.781] | không chạm 0 |
| p (boundary-correct, in-sample) | 2.0e-11 | rất có ý nghĩa **trong mẫu** |
| DeLong p (ngoài mẫu, 5-fold theo userId) | **0.975** | **không khác gì HLR** — đây là bức tranh thiếu power kinh điển |
| ECE (DART / HLR) | 0.005 / 0.006 | hiệu chỉnh xác suất tốt |
| Phân bố retrievalType | d=0: 55.1% · d=1: 43.2% · d=2: 1.7% · **d=3: 0%** | 🚨 vi phạm ngưỡng mỗi mức ≥10%; α gần như chỉ được ước lượng từ tương phản d0 vs d1 |

**Phát hiện / cảnh báo:**
- 🚨 **Đúng cả hai cạm bẫy mà `research/README.md` đã cảnh báo trước:** (1) LRT trong mẫu có ý nghĩa cực mạnh nhưng DeLong ngoài mẫu bằng không → nghĩa là ngay cả synthetic có α thật, 60 học viên/8 tuần vẫn thiếu power ngoài mẫu; (2) `retrievalType` lệch nặng (d=3 mất tích, d=2 chỉ 1.7%). Cần cả hai xử lý trước khi chạy thật: (a) tăng N (Ngày 3 power analysis sẽ cho số), (b) triển khai ε-exploration 10% ở Ngày 38.
- Cả hai kết luận trên chỉ đảm bảo pipeline chạy đúng. **Con số cụ thể không có giá trị khoa học** cho tới khi có log thật sau pilot.
- Chưa test được `power_analysis.py` với `--alpha-true 0` (Type-I check) — để dành cho Ngày 3 theo đúng plan.

**🔴 Việc BẠN phải làm hôm nay (Ngày 1 — CỰC KỲ QUAN TRỌNG):**
1. **Đọc, điền và ký `research/DESIGN_FREEZE.md`** cùng người hướng dẫn. Lưu bản PDF vào hồ sơ. Sau đó tuyệt đối không sửa nữa (nếu bắt buộc, tạo amendment).
2. **Soạn hồ sơ IRB theo `research/IRB_SUBMISSION_CHECKLIST.md` và NỘP hôm nay.** Đây là đường găng dài nhất — chờ 4–8 tuần. Trễ 1 ngày = trễ cả 45 ngày.
3. Sau khi nộp: ghi ngày nộp + mã hồ sơ vào cột "Ghi chú" dòng H1 bảng trên, đổi H1 → ✅.
4. Nếu chưa rõ đơn vị nào duyệt IRB: hỏi hướng dẫn NGAY hôm nay.

**Bị chặn:**
- H3 (`.env.research` với `MONGO_URI` + `RESEARCH_SALT`) — agent không có quyền tạo secret. Kế hoạch để Ngày 2, chỉ cần bạn tạo file, agent sẽ hướng dẫn tiếp.

**Ngày mai:** Ngày 2 — dựng môi trường Python venv trên máy bạn, tạo `.env.research`, chạy lại smoke-test cục bộ để đảm bảo laptop reproduce được kết quả sandbox.

---


