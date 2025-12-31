import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';
import { generateImagePrompt } from '@/lib/imagePromptGenerator';
import { searchImagesMultiSource, specificImageUrls } from '@/lib/multiSourceImageSearch';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, word, meaning, type = 'danh từ', example = '' } = await req.json();

    if (!word) {
      return NextResponse.json(
        { success: false, message: "Word is required" },
        { status: 400 }
      );
    }

    // Use the new smart image search API
    const smartSearchResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/smart-image-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word,
        meaning,
        type,
        example
      })
    });

    const smartSearchData = await smartSearchResponse.json();
    
    if (smartSearchData.success) {
      return NextResponse.json({
        success: true,
        imageUrl: smartSearchData.imageUrl,
        source: smartSearchData.source,
        confidence: smartSearchData.confidence,
        description: smartSearchData.description,
        visualConcept: smartSearchData.visualConcept,
        searchTerms: smartSearchData.searchTerms,
        alternatives: smartSearchData.alternatives
      });
    }

    // Fallback to original method if smart search fails
    const specificUrl = specificImageUrls[word.toLowerCase()];
    if (specificUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: specificUrl,
        source: 'curated-fallback',
        confidence: 90
      });
    }

    // Ultimate fallback
    const fallbackUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(meaning || word)}`;
    
    return NextResponse.json({
      success: true,
      imageUrl: fallbackUrl,
      source: 'ultimate-fallback',
      confidence: 50
    });

  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { success: false, message: "Image generation failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const word = searchParams.get('word');
    const style = searchParams.get('style') || 'realistic';

    if (!word) {
      return NextResponse.json(
        { success: false, message: "Word parameter is required" },
        { status: 400 }
      );
    }

    // Quick image using Unsplash Source
    const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(word)}`;
    
    return NextResponse.json({
      success: true,
      imageUrl,
      word,
      style,
      source: 'unsplash-source'
    });

  } catch (error) {
    console.error("Quick image error:", error);
    return NextResponse.json(
      { success: false, message: "Quick image generation failed" },
      { status: 500 }
    );
  }
}