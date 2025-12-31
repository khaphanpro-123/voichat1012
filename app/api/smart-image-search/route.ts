import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Comprehensive Vietnamese-English concept mapping
const conceptDatabase: { [key: string]: {
  concepts: string[];
  unsplashUrl: string;
  description: string;
  category: string;
}} = {
  // Technology
  'lập trình': {
    concepts: ['programming', 'coding', 'developer', 'computer code', 'software development'],
    unsplashUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop',
    description: 'Person coding on computer with multiple screens',
    category: 'technology'
  },
  'máy tính': {
    concepts: ['computer', 'laptop', 'desktop', 'PC', 'workstation'],
    unsplashUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop',
    description: 'Modern laptop computer on desk',
    category: 'technology'
  },
  'phần mềm': {
    concepts: ['software', 'application', 'program', 'app', 'interface'],
    unsplashUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop',
    description: 'Software interface on computer screen',
    category: 'technology'
  },
  'internet': {
    concepts: ['internet', 'web', 'online', 'network', 'connectivity'],
    unsplashUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop',
    description: 'Global network connections visualization',
    category: 'technology'
  },
  
  // Education
  'học tập': {
    concepts: ['studying', 'learning', 'education', 'student', 'books'],
    unsplashUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop',
    description: 'Student studying with books and notes',
    category: 'education'
  },
  'giáo dục': {
    concepts: ['education', 'teaching', 'school', 'classroom', 'teacher'],
    unsplashUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop',
    description: 'Teacher in classroom with students',
    category: 'education'
  },
  'sách': {
    concepts: ['book', 'books', 'reading', 'library', 'literature'],
    unsplashUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
    description: 'Stack of books on table',
    category: 'education'
  },
  
  // Actions
  'chạy': {
    concepts: ['running', 'run', 'jogging', 'sprint', 'exercise'],
    unsplashUrl: 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&h=600&fit=crop',
    description: 'Person running on track',
    category: 'action'
  },
  'viết': {
    concepts: ['writing', 'write', 'pen', 'paper', 'handwriting'],
    unsplashUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=600&fit=crop',
    description: 'Hand writing with pen on paper',
    category: 'action'
  },
  'đọc': {
    concepts: ['reading', 'read', 'book', 'study', 'literature'],
    unsplashUrl: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop',
    description: 'Person reading a book',
    category: 'action'
  },
  
  // Family & Relationships
  'gia đình': {
    concepts: ['family', 'parents', 'children', 'home', 'together'],
    unsplashUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=600&fit=crop',
    description: 'Happy family together at home',
    category: 'family'
  },
  'bạn bè': {
    concepts: ['friends', 'friendship', 'social', 'people', 'together'],
    unsplashUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop',
    description: 'Group of friends laughing together',
    category: 'social'
  },
  
  // Business
  'kinh doanh': {
    concepts: ['business', 'commerce', 'trade', 'company', 'meeting'],
    unsplashUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=600&fit=crop',
    description: 'Business meeting in modern office',
    category: 'business'
  },
  'làm việc': {
    concepts: ['work', 'working', 'office', 'job', 'professional'],
    unsplashUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop',
    description: 'Person working at desk with computer',
    category: 'business'
  },
  
  // Nature
  'cây': {
    concepts: ['tree', 'trees', 'nature', 'forest', 'green'],
    unsplashUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    description: 'Beautiful tree in natural setting',
    category: 'nature'
  },
  'hoa': {
    concepts: ['flower', 'flowers', 'bloom', 'garden', 'colorful'],
    unsplashUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&h=600&fit=crop',
    description: 'Beautiful colorful flowers in garden',
    category: 'nature'
  },
  
  // Food
  'ăn': {
    concepts: ['eating', 'food', 'meal', 'dining', 'nutrition'],
    unsplashUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
    description: 'Delicious meal on table',
    category: 'food'
  },
  'nấu ăn': {
    concepts: ['cooking', 'chef', 'kitchen', 'food preparation', 'culinary'],
    unsplashUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
    description: 'Chef cooking in professional kitchen',
    category: 'food'
  }
};

export async function POST(req: NextRequest) {
  try {
    const { word, meaning, type, example, context } = await req.json();

    if (!word) {
      return NextResponse.json(
        { success: false, message: "Word is required" },
        { status: 400 }
      );
    }

    // Step 1: Check curated database first
    const curatedData = conceptDatabase[word.toLowerCase()];
    if (curatedData) {
      return NextResponse.json({
        success: true,
        imageUrl: curatedData.unsplashUrl,
        source: 'curated',
        description: curatedData.description,
        concepts: curatedData.concepts,
        category: curatedData.category,
        confidence: 100
      });
    }

    // Step 2: Use AI to find the best visual concept
    let visualConcept = '';
    let searchTerms: string[] = [];
    
    try {
      const conceptPrompt = `
Bạn là chuyên gia tìm hình ảnh cho từ vựng tiếng Việt. Hãy tìm khái niệm hình ảnh tốt nhất cho:

TỪ: "${word}"
NGHĨA: "${meaning || ''}"
LOẠI TỪ: "${type || ''}"
VÍ DỤ: "${example || ''}"

YÊU CẦU:
1. Tìm khái niệm hình ảnh cụ thể, rõ ràng nhất
2. Tạo 5 từ khóa tiếng Anh tốt nhất để tìm hình
3. Mô tả ngắn gọn hình ảnh lý tưởng

ĐỊNH DẠNG JSON:
{
  "visualConcept": "mô tả ngắn gọn khái niệm hình ảnh",
  "searchTerms": ["term1", "term2", "term3", "term4", "term5"],
  "description": "mô tả hình ảnh lý tưởng",
  "category": "technology/education/action/family/business/nature/food/other"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Bạn là chuyên gia tìm hình ảnh. Luôn trả về JSON hợp lệ."
          },
          {
            role: "user",
            content: conceptPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]);
          visualConcept = aiResult.visualConcept;
          searchTerms = aiResult.searchTerms || [];
        }
      }
    } catch (aiError) {
      console.error("AI concept generation error:", aiError);
    }

    // Fallback search terms if AI fails
    if (searchTerms.length === 0) {
      searchTerms = [
        meaning || word,
        word,
        `${meaning} illustration`,
        `${word} concept`,
        'education'
      ].filter(Boolean);
    }

    // Step 3: Generate multiple image options
    const imageOptions = [];

    // Option 1: Best search term with Unsplash
    const primaryTerm = searchTerms[0];
    imageOptions.push({
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(primaryTerm)}`,
      source: 'unsplash-primary',
      searchTerm: primaryTerm,
      confidence: 85
    });

    // Option 2: Secondary search term
    if (searchTerms[1]) {
      imageOptions.push({
        url: `https://source.unsplash.com/800x600/?${encodeURIComponent(searchTerms[1])}`,
        source: 'unsplash-secondary',
        searchTerm: searchTerms[1],
        confidence: 75
      });
    }

    // Option 3: Combined terms
    const combinedTerm = searchTerms.slice(0, 2).join('+');
    imageOptions.push({
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(combinedTerm)}`,
      source: 'unsplash-combined',
      searchTerm: combinedTerm,
      confidence: 70
    });

    // Option 4: Category-based fallback
    const categoryTerms = {
      'technology': 'technology+computer',
      'education': 'education+learning',
      'action': 'action+movement',
      'family': 'family+people',
      'business': 'business+office',
      'nature': 'nature+outdoor',
      'food': 'food+cooking'
    };

    const category = visualConcept.includes('technology') ? 'technology' :
                    visualConcept.includes('education') ? 'education' :
                    visualConcept.includes('action') ? 'action' : 'education';

    const categoryTerm = categoryTerms[category as keyof typeof categoryTerms] || 'education';
    imageOptions.push({
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(categoryTerm)}`,
      source: 'unsplash-category',
      searchTerm: categoryTerm,
      confidence: 60
    });

    // Return the best option with alternatives
    const bestOption = imageOptions[0];
    
    return NextResponse.json({
      success: true,
      imageUrl: bestOption.url,
      source: bestOption.source,
      searchTerm: bestOption.searchTerm,
      confidence: bestOption.confidence,
      visualConcept,
      searchTerms,
      alternatives: imageOptions.slice(1),
      description: `Image representing ${word} (${meaning})`
    });

  } catch (error) {
    console.error("Smart image search error:", error);
    
    // Ultimate fallback
    const fallbackUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(word || 'education')}`;
    
    return NextResponse.json({
      success: true,
      imageUrl: fallbackUrl,
      source: 'fallback',
      confidence: 30,
      message: 'Using fallback image'
    });
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

    // Quick lookup for GET requests
    const curatedData = conceptDatabase[word.toLowerCase()];
    if (curatedData) {
      return NextResponse.json({
        success: true,
        imageUrl: curatedData.unsplashUrl,
        source: 'curated',
        description: curatedData.description,
        concepts: curatedData.concepts,
        confidence: 100
      });
    }

    // Fallback to simple Unsplash search
    const searchTerm = meaning || word;
    const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(searchTerm)}`;
    
    return NextResponse.json({
      success: true,
      imageUrl,
      source: 'unsplash-simple',
      searchTerm,
      confidence: 70
    });

  } catch (error) {
    console.error("Smart image search GET error:", error);
    return NextResponse.json(
      { success: false, message: "Image search failed" },
      { status: 500 }
    );
  }
}