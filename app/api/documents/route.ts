import { NextRequest, NextResponse } from "next/server"
import getClientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Save document metadata
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      title, 
      file_name, 
      file_size, 
      flashcard_count, 
      entity_count, 
      relation_count,
      markmap_link,
      mermaid_link,
      excalidraw_link,
      uploaded_by 
    } = body

    if (!title || !file_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const client = await getClientPromise()
    const db = client.db("viettalk")
    const collection = db.collection("documents")

    const result = await collection.insertOne({
      title,
      file_name,
      file_size,
      flashcard_count: flashcard_count || 0,
      entity_count: entity_count || 0,
      relation_count: relation_count || 0,
      markmap_link: markmap_link || "",
      mermaid_link: mermaid_link || "",
      excalidraw_link: excalidraw_link || "",
      uploaded_by: uploaded_by || "anonymous",
      created_at: new Date(),
    })

    return NextResponse.json({
      success: true,
      document_id: result.insertedId,
    })
  } catch (error: any) {
    console.error("Document save error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save document" },
      { status: 500 }
    )
  }
}

// Get all documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const uploaded_by = searchParams.get("uploaded_by")

    const client = await getClientPromise()
    const db = client.db("viettalk")
    const collection = db.collection("documents")

    const query = uploaded_by ? { uploaded_by } : {}
    
    const documents = await collection
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json(documents)
  } catch (error: any) {
    console.error("Document fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

// Delete document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Missing document ID" },
        { status: 400 }
      )
    }

    const client = await getClientPromise()
    const db = client.db("viettalk")
    const collection = db.collection("documents")

    await collection.deleteOne({ _id: new ObjectId(id) })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Document delete error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete document" },
      { status: 500 }
    )
  }
}
