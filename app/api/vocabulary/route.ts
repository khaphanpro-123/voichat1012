import { NextRequest, NextResponse } from "next/server"
import getClientPromise from "@/lib/mongodb"

// Save vocabulary item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      word, 
      meaning, 
      example, 
      pronunciation, 
      synonyms,
      level,
      source
    } = body

    if (!word) {
      return NextResponse.json(
        { error: "Missing word field" },
        { status: 400 }
      )
    }

    const client = await getClientPromise()
    const db = client.db("viettalk")
    const collection = db.collection("vocabulary")

    // Check if word already exists
    const existing = await collection.findOne({ word })
    
    if (existing) {
      // Update existing word
      await collection.updateOne(
        { word },
        { 
          $set: {
            meaning: meaning || existing.meaning,
            example: example || existing.example,
            pronunciation: pronunciation || existing.pronunciation,
            synonyms: synonyms || existing.synonyms,
            level: level || existing.level,
            source: source || existing.source,
            updated_at: new Date()
          }
        }
      )
      
      return NextResponse.json({
        success: true,
        message: "Vocabulary updated",
        word
      })
    }

    // Insert new word
    const result = await collection.insertOne({
      word,
      meaning: meaning || "",
      example: example || "",
      pronunciation: pronunciation || "",
      synonyms: synonyms || [],
      level: level || "intermediate",
      source: source || "document",
      created_at: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "Vocabulary saved",
      id: result.insertedId,
      word
    })
  } catch (error: any) {
    console.error("Vocabulary save error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save vocabulary" },
      { status: 500 }
    )
  }
}

// Get vocabulary items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const level = searchParams.get("level")
    const source = searchParams.get("source")

    const client = await getClientPromise()
    const db = client.db("viettalk")
    const collection = db.collection("vocabulary")

    const query: any = {}
    if (level) query.level = level
    if (source) query.source = source
    
    const vocabulary = await collection
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json(vocabulary)
  } catch (error: any) {
    console.error("Vocabulary fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch vocabulary" },
      { status: 500 }
    )
  }
}
