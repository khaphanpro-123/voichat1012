import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import getClientPromise from "@/lib/mongodb"

// Save vocabulary item
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      word, 
      meaning, 
      example, 
      pronunciation,
      ipa,
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

    // Check if word already exists FOR THIS USER
    const existing = await collection.findOne({ 
      word,
      userId  // IMPORTANT: Check by userId
    })
    
    if (existing) {
      // Update existing word
      await collection.updateOne(
        { word, userId },
        { 
          $set: {
            meaning: meaning || existing.meaning,
            example: example || existing.example,
            pronunciation: pronunciation || existing.pronunciation,
            ipa: ipa || pronunciation || existing.ipa,
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
        word,
        userId
      })
    }

    // Insert new word WITH userId
    const result = await collection.insertOne({
      userId,  // IMPORTANT: Save with userId
      word,
      meaning: meaning || "",
      example: example || "",
      pronunciation: pronunciation || "",
      ipa: ipa || pronunciation || "",
      synonyms: synonyms || [],
      level: level || "intermediate",
      source: source || "document",
      created_at: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "Vocabulary saved",
      id: result.insertedId,
      word,
      userId
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
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "100")
    const level = searchParams.get("level")
    const source = searchParams.get("source")

    const client = await getClientPromise()
    const db = client.db("viettalk")
    const collection = db.collection("vocabulary")

    const query: any = { userId }  // IMPORTANT: Filter by userId
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

// Delete vocabulary item
export async function DELETE(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Please login" },
        { status: 401 }
      )
    }

    const userId = (session.user as any).id
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found in session" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get("id")

    if (!wordId) {
      return NextResponse.json(
        { error: "Missing word ID" },
        { status: 400 }
      )
    }

    const client = await getClientPromise()
    const db = client.db("viettalk")
    const collection = db.collection("vocabulary")

    const { ObjectId } = require("mongodb")
    
    // Delete only if belongs to this user
    const result = await collection.deleteOne({ 
      _id: new ObjectId(wordId),
      userId  // IMPORTANT: Only delete own vocabulary
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Word not found or unauthorized" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Word deleted successfully"
    })
  } catch (error: any) {
    console.error("Vocabulary delete error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete vocabulary" },
      { status: 500 }
    )
  }
}
