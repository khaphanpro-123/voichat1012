const fs = require('fs')

// Fix listening page
let f = fs.readFileSync('app/dashboard-new/listening/page.tsx', 'utf8')
f = f
  .replace('Luyện nghe', 'Listening Practice')
  .replace('Gõ tên video — hệ thống tự tìm và phát ngay trên trang', 'Type a video name — search and play directly on this page')
  .replace('Gõ tên video để tìm kiếm... (tự động tìm sau khi gõ)', 'Search for a video... (auto-search as you type)')
  .replace('Gõ tên video để tìm kiếm', 'Type a video name to search')
  .replace('Cần thêm', 'Add')
  .replace('vào Vercel.', 'to Vercel.')
  .replace('Lấy key miễn phí tại', 'Get a free key at')
  .replace('Đang tìm...', 'Searching...')
  .replace(/(\d+) kết quả/, '$1 results')
  .replace('`${searchResults.length} kết quả`', '`${searchResults.length} results`')
  .replace('Xem gợi ý', 'View suggestions')
  .replace('Không tìm thấy video. Thử từ khóa khác.', 'No videos found. Try a different keyword.')
fs.writeFileSync('app/dashboard-new/listening/page.tsx', f, 'utf8')
console.log('listening fixed:', fs.statSync('app/dashboard-new/listening/page.tsx').size)

// Fix DashboardHome
let d = fs.readFileSync('components/DashboardHome.tsx', 'utf8')
const viBefore = d.length
// Common Vietnamese strings in dashboard
d = d
  .replace(/Chào mừng/g, 'Welcome')
  .replace(/Bắt đầu học/g, 'Start learning')
  .replace(/Tiếp tục học/g, 'Continue learning')
  .replace(/Phiên chat/g, 'Chat sessions')
  .replace(/Tài liệu/g, 'Documents')
  .replace(/Từ vựng/g, 'Vocabulary')
  .replace(/Lỗi ngữ pháp/g, 'Grammar errors')
  .replace(/Chuỗi ngày học/g, 'Learning streak')
  .replace(/ngày/g, 'days')
  .replace(/từ/g, 'words')
  .replace(/lỗi/g, 'errors')
  .replace(/tài liệu/g, 'documents')
  .replace(/Hôm nay/g, 'Today')
  .replace(/Tuần này/g, 'This week')
  .replace(/Tổng cộng/g, 'Total')
fs.writeFileSync('components/DashboardHome.tsx', d, 'utf8')
console.log('DashboardHome fixed:', d.length - viBefore, 'chars changed')
