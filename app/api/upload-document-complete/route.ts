import { NextRequest, NextResponse } from "next/server"

// Remove trailing slash AND ensure we don't have double slashes
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://voichat1012-production.up.railway.app").replace(/\/+$/, "")

console.log("[Proxy Init] BACKEND_URL:", BACKEND_URL)
console.log("[Proxy Init] Raw env:", process.env.NEXT_PUBLIC_API_URL)

export async function POST(request: NextRequest) {
  try {
    // Get form data from request
    const formData = await request.formData()
    
    // Forward to Railway backend
    const backendEndpoint = `${BACKEND_URL}/api/upload-document-complete`
    console.log("[Proxy] Forwarding to:", backendEndpoint)
    
    const response = await fetch(backendEndpoint, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - let fetch set it with boundary
    })
    
    console.log("[Proxy] Backend response status:", response.status)
    
    if (!response.ok) {
      let errorDetail = response.statusText
      try {
        const errorData = await response.json()
        errorDetail = errorData.detail || errorData.error || errorData.message || errorDetail
      } catch {
        // If JSON parsing fails, try text
        try {
          errorDetail = await response.text()
        } catch {}
      }
      console.error("Backend error:", errorDetail)
      return NextResponse.json(
        { error: `Backend error: ${errorDetail}` },
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
