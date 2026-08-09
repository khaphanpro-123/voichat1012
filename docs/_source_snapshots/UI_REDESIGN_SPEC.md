# UI Redesign — DART Review & Study Interface

**Bản v1 — 2026-08-09 · thuộc dự án DART/CARTS**
**Tác giả:** agent + Phan Văn Kha
**Trạng thái:** Đề xuất — chờ ký DESIGN_FREEZE Mục 5bis trước khi merge vào `app/dashboard-new/`.

---

## 1. Tại sao redesign bây giờ

Ba lý do đồng thời:

1. **Ràng buộc nghiên cứu:** giao diện phải giống hệt nhau giữa 3 nhóm (DART/HLR/SM-2). Chỉ *thứ tự* task khác nhau. Redesign hôm nay = một lần cho tất cả — sau khi pilot bắt đầu (Ngày 29) không được đổi UI vì sẽ vi phạm điều kiện làm mù (`research/DESIGN_FREEZE.md` Mục 4).
2. **Chất lượng dữ liệu:** UI hiện tại chưa hiển thị `retrievalType` rõ ràng cho người học. Nếu người học không hiểu tại sao hôm nay phải làm cloze mà không phải MCQ, họ sẽ bỏ nhiều hơn → mất power cho RQ2.
3. **Duy trì tuân thủ (compliance):** ngưỡng pre-registered là ≥ 70 % session hoàn thành. UI hiện tại không có progress ring/streak — hai motif hiệu quả nhất giữ người quay lại (Duolingo, Anki 2.1 v-branch, Bunpro). Không tăng compliance = mất N thực dụng.

**Ràng buộc bất di bất dịch:** mọi thay đổi UI phải áp cho **cả 3 nhánh** cùng lúc. Không có "chỉ nhánh DART có motif hay hơn". Nếu không, kết quả RQ2 confound với UX.

---

## 2. Nguyên tắc thiết kế

Rút gọn từ Fitts, Hick, và các hướng dẫn của Bunpro/Anki 2.1:

| # | Nguyên tắc | Áp dụng cụ thể |
|---|---|---|
| N1 | **Một điều quan trọng nhất mỗi màn** | Card lớn ở giữa, không sidebar, không "related words" trong lúc review |
| N2 | **Phản hồi < 100ms** | Nút Correct/Incorrect chấm ngay client-side (không đợi server), sync log về sau (idempotent qua `clientEventId`) |
| N3 | **Motion phải có ý nghĩa** | Chỉ animate: chuyển card, reveal answer, streak +1. Cấm sparkle/particle |
| N4 | **Bàn phím ưu tiên** | Space=reveal, 1–4=grade, ←/→=undo/skip. Hiển thị hint ở góc |
| N5 | **Dark mode mặc định** | 70 % session diễn ra buổi tối theo pilot khảo sát nội bộ — dark ít gây mỏi mắt hơn |
| N6 | **Không "gamification giả"** | Không XP, không tim, không leaderboard. Chỉ streak (số ngày liên tục), progress ring (session hôm nay), và badge khi hoàn thành từ (60 badge slot cố định) |
| N7 | **Retrieval type hiển thị nhưng không ép** | Chip nhỏ ở đầu card ("MCQ · 2/10") — người học biết đang làm dạng gì, nhưng không được chọn (arm quyết định) |
| N8 | **Cấm âm thanh mặc định** | Bật opt-in. TTS phải bấm 🔊 mới phát (mặc dù listening là useful cho L2 — nhưng session review ≠ session listening) |

---

## 3. Cấu trúc màn hình mới

### 3.1 Header tối giản (48px)

```
[◀ Back]      Streak: 🔥 12 ngày         Session hôm nay: ●●●●○○○○○○  4/10       [⚙]
```

- Streak: tự động reset về 0 nếu bỏ > 48h. Không có "streak freeze" (Duolingo có — vi phạm N6).
- Progress ring dạng dot: 10 chấm, chấm đầy = card đã trả lời xong. Cấm % số — dot dễ đọc hơn ở tầm nhìn ngoại vi.

### 3.2 Card trung tâm (60vh)

Bốn dạng, cùng khung nhưng nội dung khác:

**d=0 MCQ:**
```
┌──────────────────────────────────────────┐
│ ● MCQ · 4/10                             │  <- chip retrieval type
│                                          │
│           significant                    │  <- word (h1)
│               adj                        │  <- POS (nhỏ)
│                                          │
│  ○  important enough to have a           │
│     noticeable effect or meaning         │
│  ○  extremely rare and hard to find      │
│  ○  physically large in size             │
│  ○  relating to past events only         │
│                                          │
│  [1]  [2]  [3]  [4]   ← keyboard hint    │
└──────────────────────────────────────────┘
```

**d=1 Cloze:**
```
┌──────────────────────────────────────────┐
│ ● Cloze · 4/10                           │
│                                          │
│  The study found a __________            │
│  improvement in test scores.             │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │  <- input (auto-focus)
│  └────────────────────────────────────┘  │
│                                          │
│  💡 Hint: adjective, starts with "s"     │  <- ẩn mặc định, bấm ? hiện
│                                          │
│  [Enter to submit]                       │
└──────────────────────────────────────────┘
```

**d=2 Constrained gen:**
```
┌──────────────────────────────────────────┐
│ ● Sentence · 4/10                        │
│                                          │
│  Write a sentence using:                 │
│                                          │
│           contribute (v)                 │
│                                          │
│  Collocations: contribute to, ~ towards  │
│  Length: 8–20 words                      │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │                                    │  │  <- textarea
│  └────────────────────────────────────┘  │
│                          Word count: 0   │
│                                          │
│  [Ctrl+Enter to submit]                  │
└──────────────────────────────────────────┘
```

**d=3 Paraphrase:**
```
┌──────────────────────────────────────────┐
│ ● Paraphrase · 4/10                      │
│                                          │
│  Rewrite this in your own words          │
│  (≥15 words, preserve meaning):          │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Original: The company's decision   │  │
│  │ contributed to a significant       │  │
│  │ increase in employee satisfaction. │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Similarity check: OK / Too close        │  <- realtime Jaccard
└──────────────────────────────────────────┘
```

### 3.3 Reveal state (sau khi submit)

Card lật (flip animation 200ms, cấm dài hơn) → hiển thị:

- Đúng/sai (icon + màu, không dùng chỉ màu — accessibility).
- Đáp án chuẩn + gloss tiếng Việt.
- Câu ví dụ đã học (nếu khác câu vừa test).
- Nút grade cho SM-2 arm (Again/Hard/Good/Easy — mã 1/2/3/4). DART/HLR ẩn nút này vì auto-grade.

### 3.4 Footer

```
[Skip (→)]                                       [Report issue]
```

- Skip = hoãn card sang cuối queue, không tính là sai. Log riêng field `wasSkipped`. Dùng để đo compliance nhưng không ảnh hưởng scheduler.
- Report = mở modal "Câu này có vấn đề gì?" → dropdown (typo / definition wrong / distractor sai / other) + free text. Ghi vào `IssueReport` collection để review pilot.

---

## 4. Color & typography

**Dark mode (mặc định):**

```
Background:      #0f1419
Card:            #1a1f26
Card border:     #2a3038  (1px, subtle)
Primary text:    #e6e9ef
Muted text:      #8892a0
Accent (chip):   #5eead4 (teal) — dùng cho retrieval type chip
Success:         #4ade80
Error:           #f87171
Focus ring:      #60a5fa (blue-400)
```

**Light mode:**

```
Background:      #fafbfc
Card:            #ffffff
Card border:     #e5e7eb
Primary text:    #1a1f26
Muted text:      #6b7280
Accent:          #0d9488 (teal-600)
```

**Typography:**

- Word (h1): Inter 600 · 48px · letter-spacing -0.02em
- POS: Inter 400 · 14px · italic
- Body: Inter 400 · 18px · line-height 1.6
- MCQ options: Inter 500 · 17px

Font: Inter (Google Fonts). Fallback: system UI stack.

Rationale: sans-serif dễ đọc trên màn hình, số cân đối. Không dùng Nunito/Poppins vì round-form gợi cảm giác "trẻ con" — người tham gia là sinh viên B1–B2, phần lớn 18–25.

---

## 5. Layout responsive

- **Desktop (≥ 1024px):** card 640px giữa, viewport 60vh cao, không sidebar.
- **Tablet (768–1023px):** card 90vw, header co còn 40px.
- **Mobile (≤ 767px):** card full width - 16px padding, keyboard hint ẩn (mobile không phím), buttons full width.

**Ràng buộc:** logic scheduler và log format giống hệt nhau qua mọi breakpoint. Nếu mobile tự ẩn field nào thì cũng phải ẩn ở desktop — không được có "mobile experience nghèo hơn".

---

## 6. Accessibility (WCAG 2.1 AA)

- Contrast ratio ≥ 4.5:1 cho text thường, ≥ 3:1 cho text lớn — đã check với palette §4.
- Tất cả action có ARIA label.
- Focus ring luôn hiện khi nav bằng Tab.
- Screen reader thông báo trạng thái card khi reveal (`aria-live="polite"`).
- Cấm dựa **chỉ** vào màu để phân biệt đúng/sai — luôn kèm icon + text.
- Motion respect `prefers-reduced-motion` — nếu user bật, tất cả animation flip/fade tắt.

---

## 7. Instrumentation — cái gì ghi log

**Bổ sung so với schema `ReviewLog` hiện tại:**

Không cần field mới. Reuse:
- `elapsedMs` (đã có) — từ khi card show → submit
- `taskPromptHash` (đã có) — để phát hiện task lặp
- Đề xuất thêm 2 field UI-level nhưng **không** phải primary outcome, chỉ để exploratory:
  - `revealCount` — số lần bấm hint (chỉ d=1)
  - `keyboardUsed` — bool, đúng nếu grade/submit bằng phím

Ghi vào `metadata` object của `ReviewLog` để không phá schema chính.

---

## 8. Kế hoạch triển khai

| Bước | File | Người | Hạn |
|---|---|---|---|
| 1 | Duyệt spec này (cô + PI ký) | PI + supervisor | Ngày 7 (2026-08-10) |
| 2 | Component `<ReviewCard>` mới | Agent | Ngày 8 |
| 3 | Thay `<FlashCardStudy>` cũ | Agent | Ngày 9 |
| 4 | Visual regression test (Playwright screenshot) | Agent | Ngày 10 |
| 5 | Pilot test UI 3 người ngoài mẫu | PI | Ngày 12 |
| 6 | Freeze UI vào `DESIGN_FREEZE.md` Mục 5bis | PI | Ngày 14 |

**Ràng buộc thời gian:** UI phải đóng băng trước Ngày 27 (vận hành pilot). Nếu quá hạn, giữ UI hiện tại và ghi vào Limitations của bài báo.

---

## 9. Non-goals (rõ ràng để tránh scope creep)

- ❌ Không animation "confetti" khi hoàn thành session.
- ❌ Không leaderboard, XP, level, coin.
- ❌ Không mascot / avatar.
- ❌ Không chat với AI trong màn review.
- ❌ Không "suggest another word" — sẽ phá thứ tự do scheduler chọn.
- ❌ Không TTS tự động phát — phải bấm nút.

Những thứ trên có thể hay cho retention app thương mại, nhưng cho một RCT thì chúng là confounder.

---

## 10. Mockup HTML tự chứa

Xem `research/mockups/review_ui_v1.html` — mở trong Chrome để xem đủ 4 dạng card, dark/light toggle, keyboard shortcuts, và motion.

*End of UI_REDESIGN_SPEC v1.*
