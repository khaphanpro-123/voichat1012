import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { word, meaning } = await req.json();

    if (!word) {
      return NextResponse.json(
        { success: false, message: "Word is required" },
        { status: 400 }
      );
    }

    // Use Unsplash Source API (no API key needed)
    try {
      const searchQuery = meaning || word;
      const searchTerms = [
        searchQuery,
        word,
        meaning || word
      ].filter(Boolean);

      const images = searchTerms.slice(0, 3).map((term, index) => ({
        id: `unsplash-${index}`,
        url: `https://source.unsplash.com/400x300/?${encodeURIComponent(term)}`,
        fullUrl: `https://source.unsplash.com/800x600/?${encodeURIComponent(term)}`,
        description: `Image for ${term}`,
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com'
      }));

      return NextResponse.json({
        success: true,
        images,
        source: 'unsplash-source'
      });
    } catch (unsplashError) {
      console.error("Unsplash Source error:", unsplashError);
    }

    // Fallback: Generate placeholder images or use default images
    const fallbackImages = [
      {
        id: 'placeholder-1',
        url: `https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=${encodeURIComponent(word)}`,
        fullUrl: `https://via.placeholder.com/600x400/4F46E5/FFFFFF?text=${encodeURIComponent(word)}`,
        description: `Illustration for ${word}`,
        photographer: 'Generated',
        photographerUrl: '#'
      }
    ];

    return NextResponse.json({
      success: true,
      images: fallbackImages,
      source: 'placeholder'
    });
  } catch (error) {
    console.error("Image search error:", error);
    return NextResponse.json(
      { success: false, message: "Image search failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const word = searchParams.get('word');
    const meaning = searchParams.get('meaning');

    if (!word) {
      return NextResponse.json(
        { success: false, message: "Word parameter is required" },
        { status: 400 }
      );
    }

    // Simple image generation based on word
    const imageUrl = `https://source.unsplash.com/400x300/?${encodeURIComponent(meaning || word)}`;
    
    return NextResponse.json({
      success: true,
      image: {
        url: imageUrl,
        description: `Image for ${word}`,
        source: 'unsplash-source'
      }
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { success: false, message: "Image generation failed" },
      { status: 500 }
    );
  }
}