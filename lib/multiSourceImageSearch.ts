// lib/multiSourceImageSearch.ts
export interface ImageSource {
  url: string;
  source: string;
  quality: number; // 1-10
  description: string;
}

export async function searchImagesMultiSource(
  word: string,
  meaning: string,
  searchTerms: string[]
): Promise<ImageSource[]> {
  const images: ImageSource[] = [];
  
  // 1. Unsplash Source API (free, good quality)
  for (const term of searchTerms.slice(0, 3)) {
    images.push({
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(term)}`,
      source: 'unsplash',
      quality: 8,
      description: `Unsplash image for ${term}`
    });
  }
  
  // 2. Picsum (Lorem Picsum) with specific categories
  images.push({
    url: `https://picsum.photos/800/600?random=${Math.floor(Math.random() * 1000)}`,
    source: 'picsum',
    quality: 6,
    description: `Random high-quality image`
  });
  
  // 3. Placeholder with word
  images.push({
    url: `https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=${encodeURIComponent(word)}`,
    source: 'placeholder',
    quality: 3,
    description: `Placeholder with word ${word}`
  });
  
  return images;
}

// Specific image URLs for common Vietnamese words
export const specificImageUrls: { [key: string]: string } = {
  // Technology
  'lập trình': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop',
  'máy tính': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&h=600&fit=crop',
  'phần mềm': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop',
  'internet': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop',
  'website': 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop',
  'ứng dụng': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop',
  
  // Education
  'học tập': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop',
  'giáo dục': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop',
  'kiến thức': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop',
  'sách': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
  
  // Family & Relationships
  'gia đình': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&h=600&fit=crop',
  'bạn bè': 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop',
  'yêu thương': 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&h=600&fit=crop',
  'hạnh phúc': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
  
  // Actions
  'chạy': 'https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&h=600&fit=crop',
  'viết': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=600&fit=crop',
  'đọc': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop',
  'nói': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=600&fit=crop',
  'nghe': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop',
  
  // Business
  'kinh doanh': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=600&fit=crop',
  'công ty': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop',
  'quản lý': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
  'làm việc': 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop',
  
  // Nature & Environment
  'thiên nhiên': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
  'cây': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
  'hoa': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800&h=600&fit=crop',
  'nước': 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&h=600&fit=crop',
  
  // Food
  'ăn': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
  'thức ăn': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
  'nấu ăn': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
};