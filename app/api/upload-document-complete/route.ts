import { NextRequest, NextResponse } from "next/server"

// Increase timeout for large files
export const maxDuration = 60 // 60 seconds

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    
    // Forward to Python backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://voichat1012-production.up.railway.app"
    
    console.log("Forwarding to Railway:", apiUrl)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 55000) // 55 second timeout
    
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
          { error: "Request timeout - file quá lớn hoặc xử lý quá lâu" },
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
