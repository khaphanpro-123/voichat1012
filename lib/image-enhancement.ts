/**
 * Image Enhancement for OCR
 * Cải thiện chất lượng ảnh trước khi chạy OCR
 */

export async function enhanceImageQuality(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Cannot get canvas context"))
          return
        }

        canvas.width = img.width
        canvas.height = img.height

        // Vẽ ảnh gốc
        ctx.drawImage(img, 0, 0)

        // Lấy image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Áp dụng các bộ lọc
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i]
          let g = data[i + 1]
          let b = data[i + 2]

          // Tăng độ tương phản (contrast)
          const contrast = 1.5
          r = Math.min(255, Math.max(0, (r - 128) * contrast + 128))
          g = Math.min(255, Math.max(0, (g - 128) * contrast + 128))
          b = Math.min(255, Math.max(0, (b - 128) * contrast + 128))

          // Tăng độ sáng (brightness)
          const brightness = 20
          r = Math.min(255, r + brightness)
          g = Math.min(255, g + brightness)
          b = Math.min(255, b + brightness)

          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
        }

        // Đặt lại image data
        ctx.putImageData(imageData, 0, 0)

        // Chuyển thành blob
        canvas.toBlob(resolve, "image/jpeg", 0.95)
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

export function assessImageQuality(file: File): {
  quality: "good" | "fair" | "poor"
  score: number
  issues: string[]
} {
  const issues: string[] = []
  let score = 100

  // Kiểm tra kích thước
  if (file.size < 50000) {
    issues.push("Ảnh quá nhỏ (< 50KB)")
    score -= 20
  }

  if (file.size > 10000000) {
    issues.push("Ảnh quá lớn (> 10MB)")
    score -= 15
  }

  const quality = score >= 80 ? "good" : score >= 50 ? "fair" : "poor"

  return { quality, score, issues }
}
