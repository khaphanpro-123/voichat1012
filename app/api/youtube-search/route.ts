import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query?.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 })
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 })
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search")
    url.searchParams.set("part", "snippet")
    url.searchParams.set("q", query)
    url.searchParams.set("type", "video")
    url.searchParams.set("maxResults", "10")
    url.searchParams.set("relevanceLanguage", "en")
    url.searchParams.set("key", apiKey)

    const res = await fetch(url.toString(), {
      next: { revalidate: 300 }, // cache 5 minutes
    })

    if (!res.ok) {
      const err = await res.json()
      console.error("YouTube API error:", err)
      return NextResponse.json({ error: "YouTube search failed" }, { status: res.status })
    }

    const data = await res.json()

    const videos = (data.items || []).map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
    }))

    return NextResponse.json({ videos })
  } catch (error: any) {
    console.error("YouTube search error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
