# Checklist hồ sơ IRB — nộp Ngày 1

> IRB chờ 4–8 tuần. Trễ 1 ngày = trễ cả dự án 1 ngày. Nộp trước, sửa nhỏ sau.

## Tài liệu bắt buộc

- [ ] **Đề cương nghiên cứu (3–5 trang)** — dùng `DESIGN_FREEZE.md` làm khung, mở rộng:
  - Mục tiêu, câu hỏi, giả thuyết
  - Phương pháp: thiết kế, cỡ mẫu (chưa có số cuối vì Ngày 3 mới chốt — ghi "N ≈ 200, sẽ khoá bằng power analysis trước tuyển")
  - Bảo mật dữ liệu, thời hạn lưu trữ
  - Kế hoạch phổ biến kết quả

- [ ] **Phiếu thông tin cho người tham gia** (`INFORMED_INFO_SHEET_VI.md`)
  - Viết ở trình độ đọc THPT (không dùng biệt ngữ thống kê)
  - Nêu rõ: mục đích, thời lượng (8 tuần + 2 tuần theo dõi), quyền lợi, rủi ro, quyền rút

- [ ] **Phiếu đồng ý tham gia** (`CONSENT_FORM_ADULT_VI.md`)
  - Ký tên, ngày, có chỗ chọn "đồng ý dùng dữ liệu ẩn danh cho nghiên cứu tương lai"

- [ ] **Phiếu đồng ý phụ huynh** (`CONSENT_FORM_PARENT_VI.md`) — nếu có tuyển < 18 tuổi
  - Cân nhắc: có tuyển < 18 tuổi không? Nếu chỉ sinh viên đại học thì bỏ luôn

- [ ] **Kế hoạch quản lý dữ liệu (DMP)**
  - Lưu ở đâu: MongoDB Atlas (region), Cloudflare R2
  - Ai truy cập: NCV chính + hướng dẫn
  - Ẩn danh: HMAC-SHA256(userId, RESEARCH_SALT), không lưu email trong bảng phân tích
  - Thời hạn: giữ ẩn danh 5 năm sau công bố; PII gốc xoá sau khi kết thúc thu dữ liệu
  - Chia sẻ dữ liệu: repository công khai (OSF) sau công bố, dạng ẩn danh

- [ ] **Đánh giá rủi ro**
  - Mức: rủi ro tối thiểu (minimal risk)
  - Rủi ro: mệt mỏi từ phiên học 15–20 phút/ngày; không có rủi ro thể chất
  - Giảm thiểu: nghỉ tự do, không phạt bỏ phiên, không có deadline gây áp lực

## Sau khi nộp

- [ ] Ghi **ngày nộp** và **mã số hồ sơ** vào `RESEARCH_PROGRESS.md`
  (cột "Ghi chú" ở dòng H1)
- [ ] Đánh dấu H1 → ✅ trong bảng "Việc CHỈ BẠN làm được"
- [ ] Đặt reminder tự kiểm tra tiến độ IRB mỗi 2 tuần

## Ghi chú

- Nếu đơn vị có mẫu IRB riêng — dùng mẫu đó, phần trên là danh sách nội dung
- Nếu chưa rõ đơn vị nào duyệt: hỏi hướng dẫn ngay hôm nay, không đợi
- Đăng ký OSF sau khi IRB duyệt (H4, Ngày 26). Không pre-register trước khi IRB duyệt
