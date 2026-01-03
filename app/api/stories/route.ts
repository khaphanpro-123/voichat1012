import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { connectDB } from "@/lib/db"
import Story from "@/app/models/Story"
import { authOptions } from "@/lib/authOptions"

const createStorySchema = z.object({
  mediaUrl: z.string(),
  mediaType: z.enum(["image", "video"])
})

export async function GET() {
  try {
    await connectDB()
    
    const now = new Date()
    const stories = await Story.find({
      expiresAt: { $gt: now }
    })
      .sort({ createdAt: -1 })
      .populate("author", "name avatar")
      .lean()

    // Group stories by author
    const groupedStories = stories.reduce((acc: any, story: any) => {
      const authorId = story.author._id.toString()
      if (!acc[authorId]) {
        acc[authorId] = {
          author: story.author,
          stories: []
        }
      }
      acc[authorId].stories.push(story)
      return acc
    }, {})

    const data = Object.values(groupedStories)

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { mediaUrl, mediaType } = createStorySchema.parse(body)

    await connectDB()

    // Set expiration to 24 hours from now
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const story = await Story.create({
      author: session.user.id,
      mediaUrl,
      mediaType,
      expiresAt
    })

    const populatedStory = await Story.findById(story._id)
      .populate("author", "name avatar")
      .lean()

    return NextResponse.json({ data: populatedStory }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create story" },
      { status: 500 }
    )
  }
}