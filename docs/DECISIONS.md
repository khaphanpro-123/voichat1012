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

## D-009 · DART Lab — story-mode narrative, judge → DART feed (Approach A, đã triển khai)
**Ngày:** 2026-08-09 · **Trạng thái:** ✅ Active (chọn A, đã ship, chờ user test) · **Liên quan:** `app/dashboard-new/dart-lab/page.tsx`, `lib/dart.ts`, `research/AMENDMENTS.md#A-002`, `docs/UI_UX.md`, thay thế D-007

**Ngữ cảnh:** Sau khi bạn xem redesign 4-tab (Tổng quan / Thử lịch / Chấm câu / Chia nhóm), phản hồi cụ thể:
1. **Tổng quan** — hiểu "sơ sơ" nhờ đọc text, nhưng không có hình minh hoạ. Đề xuất bạn: **thanh cuộn ngang B1→B2→B3 với ảnh + text ở mỗi bước**, xong rồi mới cho làm.
2. **Thử lịch học** — càng không hiểu hơn. Không thấy tab này *để làm gì*.
3. **Chấm câu** — "nếu chỉ có vậy thì khác gì học viên viết rồi chấm bằng AI → **DART nằm chỗ nào**?" (Không thấy liên kết giữa điểm judge và quyết định lịch học của DART.)
4. **Chia nhóm** — không hiểu mục đích, không thấy quan hệ với DART.

**Chẩn đoán:** Bốn tab hiện tại là **4 widget debug rời** — mỗi tab test 1 endpoint (`/api/dart/schedule`, `/api/carts/schedule`, `/api/context-transfer/judge`, `/api/experiment/assign`). Cấu trúc này đúng cho dev nhưng sai cho user: user không thấy **luồng thật**: `học viên vào app → thuật toán quyết bài kế → HV làm bài → judge chấm → DART cập nhật half-life → bài kế nữa`. Không có gì trong UI hiện tại giải thích **điểm judge có kết nối tới quyết định của DART không** (trong code hiện tại thì… **chưa**, đó là gap thật).

**Quyết định (dự kiến, chờ bạn chọn A/B/C):**

**A. Story-mode redesign** (khuyến nghị) — thay tab bằng 1 luồng cuộn dọc kể chuyện 1 học viên:
- Chương 1 "Vấn đề": ảnh minh hoạ Anki/Quizlet vs DART (2 khung song song, cùng 1 từ, cùng số ngày → khác thời điểm ôn). ~3 ảnh SVG.
- Chương 2 "Bên trong DART": animation ngang B1→B2→B3 (bạn đề xuất): B1 vector đặc trưng, B2 công thức half-life, B3 4 dạng retrieval → ảnh SVG + caption.
- Chương 3 "Thử ngay" — merge tab "Thử lịch học" hiện tại; sau khi chạy, output chỉ ra **luôn** "nếu HV này làm judge được X điểm, half-life kế sẽ là Y" (kết nối 3 và 4).
- Chương 4 "Nghiên cứu" — merge "Chia nhóm" với giải thích 3 nhóm DART / HLR / SM-2, ảnh minh hoạ comparison + link tới `PAPER_DRAFT_v1.md`.

**B. Giữ 4 tab, thêm minh hoạ + kết nối** — nhẹ hơn, giữ layout hiện tại nhưng:
- Tab Tổng quan: chèn 3 SVG illustration ngang (B1→B2→B3).
- Tab Thử lịch: thêm banner đầu "Đây là mô phỏng quyết định của DART cho 1 lần ôn — tab này để bạn thấy thuật toán *sẽ nói gì* trước khi triển khai cho học viên thật".
- Tab Chấm câu: sau khi có điểm, thêm 1 khối "→ Điểm này ảnh hưởng lịch sau như thế nào?" gọi tiếp `/api/dart/schedule` với score, hiện delta half-life.
- Tab Chia nhóm: thêm bảng so sánh 3 nhóm + đoạn "Vì sao cần 3 nhóm" 3–4 câu.

**C. Chỉ fix theo thứ tự ưu tiên bạn nêu** — làm 1 việc/lượt: (i) illustration Tổng quan; sau khi bạn xem xong mới sang (ii) explainer Thử lịch; v.v. Chậm nhưng ít rủi ro làm lệch ý.

**Cạm bẫy code cần biết trước:** hiện tại **điểm judge KHÔNG được feed lại vào DART**. Endpoint `/api/context-transfer/judge` chỉ ghi vào `ReviewLog.judge.*`; `/api/dart/schedule` không đọc field này. Nếu bạn chọn A hoặc B (đều yêu cầu show "judge → DART"), cần đồng thời: (a) sửa `lib/dart.ts` để `buildFeatureVector` optionally đưa judge composite vào feature, (b) chọn scale ánh xạ (composite 0–10 → quality 0–5 chẳng hạn). Đây là **thay đổi khoa học**, không phải UI thuần — cần cập nhật `research/DESIGN_FREEZE.md` và có thể phải amendment mới (giống #A-001).

**Hệ quả:**
- D-007 (side-help panel + tooltip động) — vẫn có ích, nhưng ưu tiên **sau** D-009. Đánh dấu D-007 xuống hạ ưu tiên, không superseded (hai không xung đột).
- Nếu chọn A/B → tạo `research/AMENDMENTS.md#A-002` cho việc đưa judge composite vào feature vector DART.
- Nếu chọn C và chỉ dừng ở illustration Tổng quan → không cần amendment.

**Đã chốt approach A và triển khai (2026-08-09):**
1. **UI:** viết lại `app/dashboard-new/dart-lab/page.tsx` (~700 dòng) sang single-scroll narrative 4 chương (Vấn đề / Bên trong DART / Thử ngay / Nghiên cứu), thay thế 4 tab cũ. Chương 2 dùng thanh cuộn ngang B1→B2→B3 với 3 SVG inline (FeatureVectorSvg, HalfLifeFormulaSvg, RetrievalLadderSvg) theo đề xuất của user. Chương 3 nối schedule ↔ judge: sau khi chấm câu, tự tính half-life mới với composite/10 làm x[5] và show diff visual.
2. **Khoa học:** thêm feature `recentJudgeComposite` = x[5] ∈ [0,1] vào `buildFeatureVector` (`lib/dart.ts`). `DEFAULT_DART_WEIGHTS.theta` mở rộng 5→6 dim, theta[5]=0.4 init. Amendment #A-002 ghi vào `research/AMENDMENTS.md` — status 🟡 chờ user ký (cần ký trước khi mở pilot Ngày 27).
3. **Wiring:** `ReviewLog` schema thêm `judgeComposite` (top-level, index-backed) và block `judge.{accuracy,fluency,appropriateness,creativity,composite}`. Judge queue mirror + status route ghi `judgeComposite = composite/10`. `/api/dart/schedule` query `ReviewLog` gần nhất có `judgeComposite`, đưa vào feature. Response endpoint thêm `features.recentJudgeComposite` để UI đọc.

**Kết quả đo lường được:**
- Câu hỏi #3 của user ("DART nằm chỗ nào?") giờ có câu trả lời trực quan: khối "→ DART cập nhật" trong Chương 3 hiện chính xác delta half-life theo điểm chấm.
- Câu hỏi #4 ("mục đích chia nhóm?") giờ có bảng 3 nhóm SM-2/HLR/DART kèm giải thích ablation ("HLR là DART với α=0 → thắng HLR = α có ý nghĩa").
- Câu hỏi #1 (hình minh hoạ B1→B2→B3): đã có, ngang, click-through.
- Câu hỏi #2 ("thử lịch học không hiểu"): Chương 3 giờ có 3 bước rõ ràng (chọn HV → chạy DART → chấm câu → thấy tác động ngược lại).

**Cần user làm:**
1. Restart dev server, hard-reload, xem lại.
2. Ký Amendment #A-002 (hoặc phản hồi để agent điều chỉnh khoa học). Nếu chọn "bỏ" → agent revert theta 5-dim + xoá recentJudgeComposite.

---

## D-008 · LLM-Judge async queue — MongoDB-backed + piggyback worker
**Ngày:** 2026-08-09 · **Trạng thái:** 🟡 Provisional (chờ smoke test 50 request) · **Liên quan:** `app/api/context-transfer/judge/route.ts`, `lib/async-queue-db.ts`, `app/models/JudgeScore.ts`, kế hoạch Ngày 11

**Ngữ cảnh:** Endpoint `/api/context-transfer/judge` gọi `judgeContextTransfer()` đồng bộ, mỗi call chờ LLM 2–8s → sẽ timeout Vercel 10s khi 30 học viên nộp bài đồng thời và học viên bị treo màn hình. Kế hoạch Ngày 11 yêu cầu chuyển sang async queue với SLA "POST ≤ 2s, đủ 50 JudgeScore sau ≤ 5 phút".

**Ngữ cảnh chọn backend:** Repo có 3 lựa chọn:
- `lib/queue.ts` in-memory — **không dùng được trên Vercel serverless** vì mỗi lambda invocation là fresh process, không có worker "always-on".
- `lib/async-queue-db.ts` — MongoDB-backed, đã có indexes, retry, priority. Không cần dependency mới.
- Upstash Redis — nhanh hơn nhưng cần secret mới trong `.env.research` và `verify_env.js` (đang chờ user chạy).

**Quyết định:**
1. **Backend:** MongoDB queue (`async-queue-db.ts`) — tận dụng research DB đã tách (D-003), không thêm secret, độ trễ ~1s dưới SLA 2s của Ngày 11.
2. **Worker trigger:** **Piggyback** — endpoint POST enqueue job xong `await` xử 1 pending job trước khi return `{jobId}`. Traffic pilot (15–20 người, phiên học liên tục) đủ để queue không tồn đọng. Cron backup sẽ thêm sau pilot nếu quan sát tồn đọng.
3. **API contract:**
   - `POST /api/context-transfer/judge` → 202 `{success, jobId}` trong ≤ 2s.
   - `GET /api/context-transfer/judge/status?jobId=xxx` → `{status, scores?}`.
   - Client (`dart-lab` UI + phiên học) poll status mỗi 1.5s, tối đa 30s → nếu vẫn `processing` fallback hiện "Đã ghi nhận, điểm sẽ có sau".
4. **Persistence:** Handler ghi vào **cả** `ReviewLog.judge.*` (giữ tương thích RQ3 plot cũ) **và** collection `JudgeScore` mới (audit trail, cho phép re-score sau này).

**Hệ quả:**
- Không cần Upstash Redis cho Ngày 11 → mở khoá luôn, không phải chờ `verify_env.js`.
- Ngày 17 (d=2, d=3 chấm bằng LLM-Judge) và Ngày 39–40 (validate LLM-Judge với người) đều thừa hưởng contract này.
- Test: Jest test enqueue 50 request đồng thời, mock `judgeContextTransfer`, assert (a) POST P95 < 2s, (b) tất cả `jobStatus=completed` sau ≤ 5 phút, (c) đủ 50 `JudgeScore` document.
- Rủi ro còn lại: nếu traffic pilot thưa (đêm không ai học), job pending có thể tồn > 5 phút. Chấp nhận cho pilot; production chính (200 người) sẽ thêm Vercel Cron mỗi 60s.

---

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
