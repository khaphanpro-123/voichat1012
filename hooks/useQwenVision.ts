import { useState, useEffect, useCallback } from 'react';

interface VisionResult {
  description: string;
  objects: string[];
  scene: string;
  actions: string[];
}

interface UseQwenVisionReturn {
  analyzeImage: (imageBase64: string) => Promise<VisionResult>;
  loading: boolean;
  progress: number;
  ready: boolean;
  error: string | null;
}

export function useQwenVision(): UseQwenVisionReturn {
  const [engine, setEngine] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initEngine();
  }, []);

  const initEngine = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check WebGPU support
      if (!(navigator as any).gpu) {
        throw new Error('WebGPU not supported. Please use Chrome 123+ with WebGPU enabled. Install: npm install @mlc-ai/web-llm');
      }

      // Try to dynamically import web-llm
      try {
        const webllm = await import('@mlc-ai/web-llm');
        
        const engineInstance = await (webllm as any).CreateMLCEngine(
          "qwen2-vl-2b-instruct-q4f16_1",
          {
            initProgressCallback: (report: any) => {
              setProgress(report.progress * 100);
              console.log('Qwen2-VL loading:', report.text, `${(report.progress * 100).toFixed(1)}%`);
            }
          }
        );
        
        setEngine(engineInstance);
        console.log('✅ Qwen2-VL loaded successfully');
      } catch (importError) {
        throw new Error('Cannot find module \'@mlc-ai/web-llm\'. Please run: npm install @mlc-ai/web-llm');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Qwen2-VL';
      setError(errorMessage);
      console.error('❌ Qwen2-VL load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = useCallback(async (imageBase64: string): Promise<VisionResult> => {
    if (!engine) {
      throw new Error('Qwen2-VL engine not initialized');
    }

    const prompt = `Analyze this image and provide a JSON response with:
1. description: A brief 1-2 sentence description
2. objects: Array of objects detected (e.g., ["person", "tree", "car"])
3. scene: Scene type (e.g., "indoor", "outdoor", "shopping_mall")
4. actions: Array of actions happening (e.g., ["standing", "walking"])

Respond ONLY with valid JSON, no additional text.

Example format:
{
  "description": "A man standing next to a Christmas tree in a shopping mall",
  "objects": ["person", "christmas_tree", "mall"],
  "scene": "indoor_shopping_mall",
  "actions": ["standing"]
}`;

    try {
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageBase64 } }
          ]
        }
      ];

      const response = await engine.chat.completions.create({
        messages,
        temperature: 0.2,
        max_tokens: 512
      });

      const content = response.choices[0].message.content;
      
      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      return {
        description: result.description || 'Image analysis',
        objects: result.objects || [],
        scene: result.scene || 'general',
        actions: result.actions || []
      };
    } catch (err) {
      console.error('Vision analysis error:', err);
      
      // Fallback result
      return {
        description: 'Unable to analyze image with AI. Using fallback.',
        objects: ['object'],
        scene: 'general',
        actions: []
      };
    }
  }, [engine]);

  return {
    analyzeImage,
    loading,
    progress,
    ready: !!engine && !loading,
    error
  };
}
