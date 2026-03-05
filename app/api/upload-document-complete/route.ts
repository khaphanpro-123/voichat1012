import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://voichat1012-production.up.railway.app"

export async function POST(request: NextRequest) {
  try {
    // Get form data from request
    const formData = await request.formData()
    
    // Forward to Railway backend
    const response = await fetch(`${BACKEND_URL}/upload-document-complete`, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - let fetch set it with boundary
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error("Backend error:", error)
      return NextResponse.json(
        { error: `Backend error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Proxy error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    )
  }
}
