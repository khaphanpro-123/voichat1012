/**
 * OCR Extraction API
 * Handles image-to-text conversion on the backend
 * More reliable than client-side OCR for large images
 */

import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "https://voichat1012-production.up.railway.app").replace(/\/$/, "")

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      )
    }

    console.log("[OCR API] Processing image:", file.name, "Size:", file.size)

    // Forward to backend for OCR processing
    const backendFormData = new FormData()
    backendFormData.append("file", file)

    const response = await fetch(`${BACKEND_URL}/api/ocr-extract`, {
      method: "POST",
      body: backendFormData,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("[OCR API] Backend error:", error)
      return NextResponse.json(
        { error: `OCR failed: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Ensure text is a string
    if (data.text && typeof data.text !== "string") {
      console.warn("[OCR API] Converting text to string")
      data.text = String(data.text || "")
    }

    console.log("[OCR API] OCR successful, text length:", data.text?.length || 0)

    return NextResponse.json({
      success: true,
      text: data.text || "",
      confidence: data.confidence || 0,
    })
  } catch (error: any) {
    console.error("[OCR API] Error:", error)
    return NextResponse.json(
      { error: error.message || "OCR processing failed" },
      { status: 500 }
    )
  }
}
