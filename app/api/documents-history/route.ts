import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import getClientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json([], { status: 401 })
    const userId = (session.user as any).id
    if (!userId) return NextResponse.json([], { status: 401 })

    const client = await getClientPromise()
    const db = client.db("viettalk")
    const docs = await db.collection("document_history")
      .find({ userId })
      .sort({ uploadedAt: -1 })
      .limit(20)
      .toArray()

    return NextResponse.json(docs)
  } catch (error: any) {
    return NextResponse.json([], { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as any).id
    if (!userId) return NextResponse.json({ error: "No userId" }, { status: 401 })

    const body = await request.json()
    const { filename, fileSize, vocabularyCount, topicsCount } = body

    const client = await getClientPromise()
    const db = client.db("viettalk")
    await db.collection("document_history").insertOne({
      userId,
      filename: filename || "Unknown",
      fileSize: fileSize || 0,
      vocabularyCount: vocabularyCount || 0,
      topicsCount: topicsCount || 0,
      uploadedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
