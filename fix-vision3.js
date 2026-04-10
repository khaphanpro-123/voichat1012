const fs = require('fs')

// Add image compression helper to ai-chat page
let page = fs.readFileSync('app/dashboard-new/ai-chat/page.tsx', 'utf8')

// Add compressImage function after the QUICK array
const compressFn = `
// Compress image to max 800px and 0.7 quality to stay under Vercel 4.5MB limit
async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 800
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement("canvas")
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL("image/jpeg", 0.7))
    }
    img.src = dataUrl
  })
}

`

page = page.replace(
  'export default function AiChatPage() {',
  compressFn + 'export default function AiChatPage() {'
)

// Compress image before sending
page = page.replace(
  '    // Capture image before clearing state\n    const capturedImage = image',
  '    // Capture and compress image before clearing state\n    const rawImage = image\n    const capturedImage = rawImage ? await compressImage(rawImage) : null'
)

fs.writeFileSync('app/dashboard-new/ai-chat/page.tsx', page, 'utf8')
console.log('Page fixed:', fs.statSync('app/dashboard-new/ai-chat/page.tsx').size)
