"""Build PAPER_tasks.xlsx matching the Google Sheet template columns.

Columns:
  A Việc cần làm | B Trạng thái | C Chủ sở hữu | D Giai đoạn | E Ngày đến hạn | F Ghi chú

Status vocabulary (khớp validation của template gốc):
  "Chưa bắt đầu" · "Đang thực hiện" · "Bị chặn" · "Đã hoàn thành"

Phase vocabulary:
  "Trước sự kiện" · "Ngày" · "Sau sự kiện"

Ngày 1 = 2026-08-04. Hôm nay = 2026-08-09 (Ngày 6).
Sự kiện cốt lõi: pilot start = 2026-09-01 (Ngày 29), main study = 2026-09-17 (Ngày 45),
posttest delayed = 2026-11-19, nộp bài = 2027-01-15.
"""

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation


STATUS_DONE = "Đã hoàn thành"
STATUS_DOING = "Đang thực hiện"
STATUS_BLOCK = "Bị chặn"
STATUS_TODO = "Chưa bắt đầu"

PHASE_BEFORE = "Trước sự kiện"
PHASE_DAY = "Ngày"
PHASE_AFTER = "Sau sự kiện"

# (task, status, owner, phase, dd/mm/yyyy, note)
ROWS = [
    # --- Cơ sở lý thuyết & thiết kế ---
    ("Ký DESIGN_FREEZE (H2)", STATUS_DONE, "Phan Văn Kha", PHASE_BEFORE, "07/08/2026", "Đã ký 2026-08-07"),
    ("Nộp hồ sơ IRB (H1)", STATUS_DONE, "Phan Văn Kha", PHASE_BEFORE, "07/08/2026", "Đã nộp, chờ 4-8 tuần duyệt"),
    ("Draft Introduction + Research background (Paper §1-§2)", STATUS_DONE, "Agent", PHASE_BEFORE, "09/08/2026", "PAPER_DRAFT_v1.md §1-§2 xong; thiếu 5 refs [TBD]"),
    ("Pre-registration OSF (H4)", STATUS_TODO, "Phan Văn Kha", PHASE_BEFORE, "29/08/2026", "Chờ IRB duyệt trước"),
    ("Bổ sung 5 references [TBD] (Cheng 2022, Traxler 2024, Ye 2022, Nguyen & Godfroid 2020, Pham & Nguyen 2024)", STATUS_TODO, "Phan Văn Kha", PHASE_BEFORE, "15/09/2026", "Trong Paper §References"),

    # --- Phương pháp & mô hình ---
    ("Tạo .env.research (H3)", STATUS_DONE, "Phan Văn Kha", PHASE_BEFORE, "07/08/2026", "Đã có, mở khoá Ngày 6"),
    ("Implement DART model + HLR baseline", STATUS_DONE, "Agent", PHASE_BEFORE, "07/08/2026", "research/dart_model.py"),
    ("Implement Cluster-bootstrap LRT (Amendment #A-001)", STATUS_DONE, "Agent", PHASE_BEFORE, "07/08/2026", "Ký amendment 2026-08-07; test 13/13 PASS"),
    ("Chạy full 1000-rep cluster-bootstrap Type-I trên laptop", STATUS_TODO, "Phan Văn Kha", PHASE_BEFORE, "12/08/2026", "~2 phút CPU. Báo p_cluster_boundary"),
    ("Word bank 60 từ pre-registered (frozen)", STATUS_DONE, "Agent", PHASE_BEFORE, "04/08/2026", "lib/wordBank.ts, 305/305 test PASS"),
    ("4 dạng retrieval task (d=0/1/2/3)", STATUS_DONE, "Agent", PHASE_BEFORE, "20/08/2026", "Chạy sớm ở batch"),
    ("Posttest 3 phần (Recall/Cloze/CT)", STATUS_DONE, "Agent", PHASE_BEFORE, "24/08/2026", "28/28 test PASS"),
    ("Rubric 4 chiều + LLM Judge", STATUS_DONE, "Agent", PHASE_BEFORE, "25/08/2026", "26/26 test PASS"),
    ("Familiarity screening 20 người (H5)", STATUS_TODO, "Phan Văn Kha", PHASE_BEFORE, "26/08/2026", "Loại từ >70% biết"),
    ("Viết script DeLong out-of-sample test", STATUS_TODO, "Agent", PHASE_BEFORE, "01/09/2026", "research/delong_test.py — chưa có"),

    # --- Hạ tầng vận hành ---
    ("Backend endpoint hợp nhất /api/research/review", STATUS_DONE, "Agent", PHASE_BEFORE, "11/08/2026", "Idempotent qua clientEventId"),
    ("Blinding điều kiện thí nghiệm", STATUS_DONE, "Agent", PHASE_BEFORE, "22/08/2026", "lib/experimentBlinding.ts"),
    ("Tách research DB (lib/researchDb.ts + verify_env + create_indexes + backup script)", STATUS_DONE, "Agent", PHASE_BEFORE, "07/08/2026", "Backend xong; restore drill chưa chạy"),
    ("Chạy node research/verify_env.js trên laptop", STATUS_DOING, "Phan Văn Kha", PHASE_DAY, "10/08/2026", "Mở khoá Ngày 11"),
    ("Chạy node research/create_indexes.js trên laptop", STATUS_DOING, "Phan Văn Kha", PHASE_DAY, "10/08/2026", "Bắt buộc trước enrol"),
    ("Restore drill (Ngày 6 exit criterion)", STATUS_TODO, "Phan Văn Kha", PHASE_DAY, "12/08/2026", "mongodump + mongorestore vào DB tạm, đếm khớp"),
    ("Windows Task Scheduler cho backup daily 03:00", STATUS_TODO, "Phan Văn Kha", PHASE_DAY, "12/08/2026", "Cài MongoDB Database Tools trước"),
    ("Async LLM-judge queue (Ngày 11)", STATUS_BLOCK, "Agent", PHASE_BEFORE, "14/08/2026", "Chờ verify_env.js OK cho Upstash"),
    ("Cache task + fallback provider (Ngày 12)", STATUS_BLOCK, "Agent", PHASE_BEFORE, "15/08/2026", "Chờ Ngày 11"),

    # --- UI/UX ---
    ("Soạn UI redesign spec + mockup HTML", STATUS_DONE, "Agent", PHASE_BEFORE, "09/08/2026", "docs/UI_UX.md + research/mockups/review_ui_v1.html"),
    ("Ký duyệt UI spec (PI + supervisor)", STATUS_TODO, "Phan Văn Kha + Cô hướng dẫn", PHASE_BEFORE, "10/08/2026", "Trước khi implement component"),
    ("Component React <ReviewCard> thay <FlashCardStudy>", STATUS_TODO, "Agent", PHASE_BEFORE, "11/08/2026", "Sau khi spec được duyệt"),
    ("Playwright visual regression test", STATUS_TODO, "Agent", PHASE_BEFORE, "13/08/2026", "Sau component xong"),
    ("Pilot UX 3 người ngoài mẫu", STATUS_TODO, "Phan Văn Kha", PHASE_BEFORE, "15/08/2026", ""),
    ("Freeze UI vào DESIGN_FREEZE Mục 5bis", STATUS_TODO, "Phan Văn Kha", PHASE_BEFORE, "17/08/2026", "Ngày 14"),

    # --- Sản phẩm production (ngoài RCT) ---
    ("Wordbank 2 tầng (cold-start + personalized)", STATUS_DONE, "Agent", PHASE_BEFORE, "09/08/2026", "16/16 test PASS. Cách ly khỏi nghiên cứu"),
    ("Mở rộng pool lên 300 từ (AWL Sublist 4-7 + NGSL)", STATUS_TODO, "Agent", PHASE_BEFORE, "18/08/2026", "Ngày 15"),
    ("Mở rộng pool lên 500-1000 từ (import CEFR-J)", STATUS_TODO, "Agent", PHASE_BEFORE, "02/09/2026", "Ngày 30"),
    ("Endpoint API cho wordbank selector", STATUS_TODO, "Agent", PHASE_BEFORE, "18/08/2026", "app/api/vocabulary/select/route.ts"),
    ("Migration User.wordBankMode + personalWordCount", STATUS_TODO, "Agent", PHASE_BEFORE, "18/08/2026", ""),
    ("Sắp xếp lại repo (docs/ scripts/) + gộp 6 file canonical", STATUS_DONE, "Agent", PHASE_BEFORE, "09/08/2026", "docs/INDEX.md liệt kê"),

    # --- Mốc người H1-H10 chưa xong ---
    ("Tuyển 2 giáo viên chấm rubric (H6)", STATUS_TODO, "Phan Văn Kha + Cô hướng dẫn", PHASE_BEFORE, "28/08/2026", "Cần cho ICC. Chặn RQ3"),
    ("Tuyển 15-20 người pilot (H7)", STATUS_TODO, "Phan Văn Kha", PHASE_BEFORE, "30/08/2026", ""),
    ("Onboarding pilot (H8)", STATUS_TODO, "Phan Văn Kha", PHASE_BEFORE, "01/09/2026", "Ngày 29 = pilot start"),
    ("Phỏng vấn 5 người giữa pilot (H9)", STATUS_TODO, "Phan Văn Kha", PHASE_DAY, "07/09/2026", "Kiểm tra làm mù"),
    ("Tuyển 200 người nghiên cứu chính (H10)", STATUS_TODO, "Phan Văn Kha + Cô hướng dẫn", PHASE_BEFORE, "16/09/2026", "Đường găng thứ 2. Bắt đầu sớm!"),

    # --- Phân tích & viết bài (sau pilot) ---
    ("Diễn tập toàn hệ thống (E2E test)", STATUS_TODO, "Agent", PHASE_BEFORE, "31/08/2026", "Ngày 28"),
    ("Pilot chạy - theo dõi hằng ngày", STATUS_TODO, "Phan Văn Kha", PHASE_DAY, "06/09/2026", "Ngày 30-34"),
    ("Kết thúc pilot, export dữ liệu", STATUS_TODO, "Agent", PHASE_DAY, "08/09/2026", "Ngày 36"),
    ("Fit DART lần đầu trên dữ liệu thật", STATUS_TODO, "Agent", PHASE_AFTER, "09/09/2026", "Ngày 37 - Paper §4.2"),
    ("Sửa vấn đề định danh α (ε-exploration verify)", STATUS_TODO, "Agent", PHASE_AFTER, "10/09/2026", "Ngày 38"),
    ("Validate LLM-Judge với người (ICC≥.70)", STATUS_TODO, "Agent + 2 giáo viên", PHASE_AFTER, "12/09/2026", "Ngày 39-40. Chặn RQ3 primary"),
    ("Cập nhật power analysis bằng param thật", STATUS_TODO, "Agent", PHASE_AFTER, "13/09/2026", "Ngày 41"),
    ("Sửa hệ thống theo bài học pilot, đóng băng code", STATUS_TODO, "Agent", PHASE_AFTER, "14/09/2026", "Ngày 42"),
    ("Go/No-Go cho main study", STATUS_TODO, "Phan Văn Kha + Cô hướng dẫn", PHASE_AFTER, "15/09/2026", "Ngày 43"),
    ("Khởi động main study + bắt đầu viết Discussion §5", STATUS_TODO, "Phan Văn Kha", PHASE_AFTER, "17/09/2026", "Ngày 45"),
    ("Main study chạy 8 tuần", STATUS_TODO, "Phan Văn Kha", PHASE_AFTER, "05/11/2026", "8 tuần intervention"),
    ("Delayed posttest tuần 10", STATUS_TODO, "Phan Văn Kha", PHASE_AFTER, "19/11/2026", "Paper §3.4"),
    ("Viết Results §4 với số thật", STATUS_TODO, "Phan Văn Kha + Agent", PHASE_AFTER, "25/11/2026", "Thay [TBD] bằng số thật"),
    ("Viết Discussion §5 hoàn chỉnh", STATUS_TODO, "Phan Văn Kha + Cô hướng dẫn", PHASE_AFTER, "10/12/2026", ""),
    ("Nộp bản thảo lên Computers & Education", STATUS_TODO, "Phan Văn Kha + Cô hướng dẫn", PHASE_AFTER, "15/01/2027", "Deadline nộp"),
]


def main():
    wb = Workbook()
    ws = wb.active
    ws.title = "Trang tính1"

    # Column widths
    widths = {"A": 68, "B": 18, "C": 26, "D": 18, "E": 16, "F": 55}
    for col, w in widths.items():
        ws.column_dimensions[col].width = w

    # Header
    headers = ["Việc cần làm", "Trạng thái", "Chủ sở hữu", "Giai đoạn", "Ngày đến hạn", "Ghi chú"]
    for j, h in enumerate(headers, start=1):
        c = ws.cell(row=1, column=j, value=h)
        c.font = Font(bold=True, color="FFFFFF", size=12)
        c.fill = PatternFill("solid", fgColor="1F4E79")
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = Border(bottom=Side(style="medium", color="000000"))

    ws.row_dimensions[1].height = 32
    ws.freeze_panes = "A2"

    # Fill data + color-code status
    fills = {
        STATUS_DONE:  PatternFill("solid", fgColor="C6EFCE"),   # green
        STATUS_DOING: PatternFill("solid", fgColor="FFEB9C"),   # yellow
        STATUS_BLOCK: PatternFill("solid", fgColor="FFC7CE"),   # red
        STATUS_TODO:  PatternFill("solid", fgColor="D9E1F2"),   # light blue
    }
    font_colors = {
        STATUS_DONE: "006100",
        STATUS_DOING: "9C5700",
        STATUS_BLOCK: "9C0006",
        STATUS_TODO: "1F4E79",
    }

    thin = Side(style="thin", color="D0D0D0")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)

    for i, (task, status, owner, phase, due, note) in enumerate(ROWS, start=2):
        vals = [task, status, owner, phase, due, note]
        for j, v in enumerate(vals, start=1):
            c = ws.cell(row=i, column=j, value=v)
            c.alignment = Alignment(vertical="top", wrap_text=True)
            c.border = border
            c.font = Font(size=11)
        # Color the status cell
        sc = ws.cell(row=i, column=2)
        sc.fill = fills[status]
        sc.font = Font(bold=True, color=font_colors[status], size=11)
        sc.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        # Date cell centered
        ws.cell(row=i, column=5).alignment = Alignment(horizontal="center", vertical="top")

    # Data validation for status column
    dv_status = DataValidation(
        type="list",
        formula1='"Chưa bắt đầu,Đang thực hiện,Bị chặn,Đã hoàn thành"',
        allow_blank=True,
    )
    dv_status.add(f"B2:B{len(ROWS)+1}")
    ws.add_data_validation(dv_status)

    # Data validation for phase column
    dv_phase = DataValidation(
        type="list",
        formula1='"Trước sự kiện,Ngày,Sau sự kiện"',
        allow_blank=True,
    )
    dv_phase.add(f"D2:D{len(ROWS)+1}")
    ws.add_data_validation(dv_phase)

    # Summary sheet
    ws2 = wb.create_sheet("Tóm tắt")
    ws2.column_dimensions["A"].width = 30
    ws2.column_dimensions["B"].width = 15
    ws2.cell(row=1, column=1, value="Chỉ số").font = Font(bold=True, size=12)
    ws2.cell(row=1, column=2, value="Giá trị").font = Font(bold=True, size=12)
    summary = [
        ("Tổng số việc", len(ROWS)),
        ("Đã hoàn thành", sum(1 for r in ROWS if r[1] == STATUS_DONE)),
        ("Đang thực hiện", sum(1 for r in ROWS if r[1] == STATUS_DOING)),
        ("Bị chặn", sum(1 for r in ROWS if r[1] == STATUS_BLOCK)),
        ("Chưa bắt đầu", sum(1 for r in ROWS if r[1] == STATUS_TODO)),
        ("", ""),
        ("Ngày hôm nay", "2026-08-09 (Ngày 6/45)"),
        ("Pilot start", "2026-09-01 (Ngày 29)"),
        ("Main study start", "2026-09-17 (Ngày 45)"),
        ("Delayed posttest", "2026-11-19"),
        ("Nộp bài dự kiến", "2027-01-15"),
    ]
    for i, (k, v) in enumerate(summary, start=2):
        ws2.cell(row=i, column=1, value=k).font = Font(size=11)
        ws2.cell(row=i, column=2, value=v).font = Font(size=11)

    out = "/sessions/brave-practical-cerf/mnt/outputs/PAPER_tasks.xlsx"
    wb.save(out)
    print(f"Saved {out} — {len(ROWS)} rows")


if __name__ == "__main__":
    main()
