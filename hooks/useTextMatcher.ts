import { useState, useEffect, useCallback } from 'react';

interface MatchResult {
  similarity: number;
  match: 'MATCH' | 'PARTIAL' | 'MISMATCH';
  contentScore: number;
  languageScore: number;
  totalScore: number;
}

interface UseTextMatcherReturn {
  compareTexts: (reference: string, userText: string) => Promise<MatchResult>;
  loading: boolean;
  ready: boolean;
  error: string | null;
}

export function useTextMatcher(): UseTextMatcherReturn {
  const [extractor, setExtractor] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initExtractor();
  }, []);

  const initExtractor = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to dynamically import transformers.js
      try {
        const transformers = await import('@xenova/transformers');
        
        // Configure to use HuggingFace CDN instead of local models
        if (transformers.env) {
          transformers.env.allowLocalModels = false;
          transformers.env.useBrowserCache = true;
        }
        
        const model = await transformers.pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          {
            progress_callback: (progress: any) => {
              console.log('Text matcher loading:', progress);
            }
          }
        );
        
        setExtractor(model);
        console.log('✅ Text matcher loaded successfully');
      } catch (importError) {
        console.warn('⚠️ Transformers.js error, using fallback:', importError);
        // Set a simple fallback
        setExtractor({ fallback: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load text matcher';
      console.error('❌ Text matcher load error:', err);
      
      // Set a simple fallback
      setExtractor({ fallback: true });
    } finally {
      setLoading(false);
    }
  };

  const cosineSimilarity = (a: number[], b: number[]): number => {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  const simpleSimilarity = (text1: string, text2: string): number => {
    // Simple word overlap similarity as fallback
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  };

  const compareTexts = useCallback(async (
    reference: string,
    userText: string
  ): Promise<MatchResult> => {
    if (!extractor) {
      throw new Error('Text matcher not initialized');
    }

    try {
      let similarity: number;

      if (extractor.fallback) {
        // Use simple fallback
        similarity = simpleSimilarity(reference, userText);
      } else {
        // Use transformer model
        const embedding1 = await extractor(reference, { 
          pooling: 'mean', 
          normalize: true 
        });
        const embedding2 = await extractor(userText, { 
          pooling: 'mean', 
          normalize: true 
        });

        similarity = cosineSimilarity(
          Array.from(embedding1.data),
          Array.from(embedding2.data)
        );
      }

      // Calculate scores
      const contentScore = Math.round(similarity * 60); // 0-60 points
      const languageScore = Math.min(40, Math.round(userText.split(/\s+/).length * 2)); // 0-40 points based on length
      const totalScore = contentScore + languageScore;

      // Determine match level
      let match: 'MATCH' | 'PARTIAL' | 'MISMATCH';
      if (similarity > 0.7) {
        match = 'MATCH';
      } else if (similarity > 0.4) {
        match = 'PARTIAL';
      } else {
        match = 'MISMATCH';
      }

      return {
        similarity: Math.round(similarity * 100),
        match,
        contentScore,
        languageScore,
        totalScore
      };
    } catch (err) {
      console.error('Text comparison error:', err);
      
      // Fallback to simple comparison
      const similarity = simpleSimilarity(reference, userText);
      const contentScore = Math.round(similarity * 60);
      const languageScore = 30;
      
      return {
        similarity: Math.round(similarity * 100),
        match: similarity > 0.5 ? 'PARTIAL' : 'MISMATCH',
        contentScore,
        languageScore,
        totalScore: contentScore + languageScore
      };
    }
  }, [extractor]);

  return {
    compareTexts,
    loading,
    ready: !!extractor && !loading,
    error
  };
}
