const fs = require('fs')

// Fix ai-chat page
let f = fs.readFileSync('app/dashboard-new/ai-chat/page.tsx', 'utf8')
f = f
  .replace(/Cuoc tro chuyen moi/g, 'New conversation')
  .replace(/Ket noi AI/g, 'AI Connection')
  .replace(/Them API key trong Settings/g, 'Add API key in Settings')
  .replace(/Chua co cuoc tro chuyen/g, 'No conversations yet')
  .replace(/tin nhan/g, 'messages')
  .replace(/Tro ly AI ca nhan hoa theo du lieu hoc tap cua ban\./g, 'AI assistant personalized to your learning data.')
  .replace(/Da ket noi:/g, 'Connected:')
  .replace(/Vao Settings de them API key/g, 'Go to Settings to add API key')
  .replace(/Giai thich thi hien tai hoan thanh/g, 'Explain present perfect tense')
  .replace(/Sua loi ngu phap cau nay/g, 'Fix grammar in this sentence')
  .replace(/Tu vung business thong dung/g, 'Common business vocabulary')
  .replace(/On lai tu vung da hoc/g, 'Review vocabulary I learned')
  .replace(/Nhap tin nhan\.\.\. \(Enter gui, Shift\+Enter xuong dong\)/g, 'Type a message... (Enter to send, Shift+Enter for new line)')
  .replace(/>Dung</g, '>Stop<')
  .replace(/>Gui</g, '>Send<')
  .replace(/Loi ket noi\. Thu lai\./g, 'Connection error. Please try again.')
  .replace(/Loi: /g, 'Error: ')
fs.writeFileSync('app/dashboard-new/ai-chat/page.tsx', f, 'utf8')
console.log('ai-chat fixed:', fs.statSync('app/dashboard-new/ai-chat/page.tsx').size)

// Fix MiniVideoPlayer
let m = fs.readFileSync('components/MiniVideoPlayer.tsx', 'utf8')
m = m
  .replace(/Ket noi AI/g, 'AI Connection')
  .replace(/Them API key trong Settings/g, 'Add API key in Settings')
console.log('MiniVideoPlayer already fixed')
