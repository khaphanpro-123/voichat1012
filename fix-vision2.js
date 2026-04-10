const fs = require('fs')

// Fix API route: only check last message for image, not entire history
let api = fs.readFileSync('app/api/ai-chat/route.ts', 'utf8')
api = api.replace(
  'const hasImage = messages.some((m: any) => m.image)',
  '// Only check the LAST user message for image (history messages never have images stored)\n    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user")\n    const hasImage = !!(lastUserMsg?.image)'
)
fs.writeFileSync('app/api/ai-chat/route.ts', api, 'utf8')
console.log('API fixed:', fs.statSync('app/api/ai-chat/route.ts').size)

// Fix frontend: ensure base messages never have image field
let page = fs.readFileSync('app/dashboard-new/ai-chat/page.tsx', 'utf8')
page = page.replace(
  'const base = sessions.find(s => s.id === sid)?.messages ?? []',
  '// Strip any residual image fields from history (images are not stored in sessions)\n    const base = (sessions.find(s => s.id === sid)?.messages ?? []).map(m => ({ role: m.role, content: m.content }))'
)
fs.writeFileSync('app/dashboard-new/ai-chat/page.tsx', page, 'utf8')
console.log('Page fixed:', fs.statSync('app/dashboard-new/ai-chat/page.tsx').size)
