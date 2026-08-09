const fs = require('fs')

let f = fs.readFileSync('app/dashboard-new/ai-chat/page.tsx', 'utf8')

// Fix: add default prompt when only image is sent
f = f.replace(
  "const userMsg: Msg = { role: \"user\", content: text, ...(image ? { image } : {}) }",
  "const userMsg: Msg = { role: \"user\", content: text || (image ? \"Please analyze this image in detail and explain what you see.\" : \"\"), ...(image ? { image } : {}) }"
)

// Fix: don't save image to localStorage (too large), but keep in cur for API call
// The key insight: cur has image, but setMsgs strips it for localStorage
// We need to send cur (with image) to API, then store without image
f = f.replace(
  "setMsgs(sid, cur); setInput(\"\"); setImage(null); setBusy(true)",
  "const curForDisplay = cur.map(m => m.image ? { ...m, image: undefined } : m)\nsetMsgs(sid, curForDisplay); setInput(\"\"); setImage(null); setBusy(true)"
)

// Fix: after streaming, update with curForDisplay not cur
f = f.replace(
  "setMsgs(sid, [...cur, { role: \"assistant\", content: \"\" }])",
  "setMsgs(sid, [...curForDisplay, { role: \"assistant\", content: \"\" }])"
)
f = f.replace(
  "out += JSON.parse(d2).choices?.[0]?.delta?.content ?? \"\"; setMsgs(sid!, [...cur, { role: \"assistant\", content: out }])",
  "out += JSON.parse(d2).choices?.[0]?.delta?.content ?? \"\"; setMsgs(sid!, [...curForDisplay, { role: \"assistant\", content: out }])"
)
f = f.replace(
  "setMsgs(sid, [...cur, { role: \"assistant\", content: \"Error: \" + (err.message ?? err.error ?? \"Unknown error\") }])",
  "setMsgs(sid, [...curForDisplay, { role: \"assistant\", content: \"Error: \" + (err.message ?? err.error ?? \"Unknown error\") }])"
)
f = f.replace(
  "if (err.name !== \"AbortError\") setMsgs(sid, [...cur, { role: \"assistant\", content: \"Connection error. Please try again.\" }])",
  "if (err.name !== \"AbortError\") setMsgs(sid, [...curForDisplay, { role: \"assistant\", content: \"Connection error. Please try again.\" }])"
)

fs.writeFileSync('app/dashboard-new/ai-chat/page.tsx', f, 'utf8')
console.log('Fixed, size:', fs.statSync('app/dashboard-new/ai-chat/page.tsx').size)
