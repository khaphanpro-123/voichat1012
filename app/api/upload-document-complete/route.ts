import { NextRequest, NextResponse } from "next/server"

// Increase timeout for large files
export const maxDuration = 300 // 5 minutes for large PDFs

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Check file size
    const file = formData.get('file') as File
    if (file && file.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json(
        { error: "File quá lớn. Vui lòng chọn file nhỏ hơn 50MB" },
        { status: 413 }
      )
    }
    
    // Forward to Python backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://voichat1012-production.up.railway.app"
    
    console.log("Forwarding to Railway:", apiUrl)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 280000) // 280 second timeout (4m 40s)
    
    try {
      const response = await fetch(`${apiUrl}/api/upload-document-complete`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Backend error:", response.status, errorText)
        
        // Better error messages
        if (response.status === 413) {
          return NextResponse.json(
            { error: "File quá lớn. Backend không thể xử lý file này" },
            { status: 413 }
          )
        }
        
        if (response.status === 502) {
          return NextResponse.json(
            { error: "Backend đang khởi động, vui lòng thử lại sau 10 giây" },
            { status: 502 }
          )
        }
        
        return NextResponse.json(
          { error: `Backend error: ${errorText}` },
          { status: response.status }
        )
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: "Request timeout - file quá lớn hoặc xử lý quá lâu. Vui lòng thử file nhỏ hơn" },
          { status: 504 }
        )
      }
      
      throw fetchError
    }
  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    )
  }
}
