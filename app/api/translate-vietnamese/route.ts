/**
 * Translate English text to Vietnamese
 * Uses Google Generative AI for translation
 */

import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "")

export async function POST(request: NextRequest) {
  try {
    const { meaning, example } = await request.json()

    if (!meaning && !example) {
      return NextResponse.json(
        { error: "Missing meaning or example" },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const translations: any = {}

    // Translate meaning
    if (meaning) {
      try {
        const meaningResult = await model.generateContent(
          `Translate this English definition to Vietnamese. Return ONLY the Vietnamese translation, nothing else:\n\n${meaning}`
        )
        const meaningText = meaningResult.response.text().trim()
        translations.meaningVi = meaningText
      } catch (err) {
        console.error("Meaning translation error:", err)
        translations.meaningVi = meaning
      }
    }

    // Translate example
    if (example) {
      try {
        const exampleResult = await model.generateContent(
          `Translate this English sentence to Vietnamese. Return ONLY the Vietnamese translation, nothing else:\n\n${example}`
        )
        const exampleText = exampleResult.response.text().trim()
        translations.exampleVi = exampleText
      } catch (err) {
        console.error("Example translation error:", err)
        translations.exampleVi = example
      }
    }

    return NextResponse.json({
      success: true,
      ...translations
    })
  } catch (error: any) {
    console.error("Translation error:", error)
    return NextResponse.json(
      { error: error.message || "Translation failed" },
      { status: 500 }
    )
  }
}
