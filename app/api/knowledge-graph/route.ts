import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { document_id, graph_data } = await request.json()

    if (!document_id || !graph_data) {
      return NextResponse.json(
        { error: "Missing document_id or graph_data" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("viettalk")
    const collection = db.collection("knowledge_graphs")

    const result = await collection.insertOne({
      document_id,
      graph_data,
      created_at: new Date(),
    })

    return NextResponse.json({
      success: true,
      id: result.insertedId,
    })
  } catch (error: any) {
    console.error("Knowledge graph save error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save knowledge graph" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const document_id = searchParams.get("document_id")

    const client = await clientPromise
    const db = client.db("viettalk")
    const collection = db.collection("knowledge_graphs")

    if (document_id) {
      const graph = await collection.findOne({ document_id })
      return NextResponse.json(graph)
    }

    const graphs = await collection.find({}).sort({ created_at: -1 }).limit(10).toArray()
    return NextResponse.json(graphs)
  } catch (error: any) {
    console.error("Knowledge graph fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch knowledge graph" },
      { status: 500 }
    )
  }
}
