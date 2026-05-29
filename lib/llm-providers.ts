// lib/llm-providers.ts
// LLM Provider Implementations for ContextTransfer Evaluation

import { LLMProvider } from './context-transfer-metric';

/**
 * OpenAI GPT Provider for ContextTransfer Evaluation
 */
export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(apiKey: string, model: string = 'gpt-4', baseURL?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL || 'https://api.openai.com/v1';
  }

  async evaluate(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert L2 English assessment specialist with extensive experience in vocabulary evaluation and second language acquisition research.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1, // Low temperature for consistent evaluation
          max_tokens: 1000,
          top_p: 0.9
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('OpenAI evaluation error:', error);
      throw new Error(`Failed to evaluate with OpenAI: ${error}`);
    }
  }

  async evaluateBatch(prompts: string[]): Promise<string[]> {
    // For OpenAI, we'll process sequentially to avoid rate limits
    // In production, you might want to implement proper batching with rate limiting
    const results: string[] = [];
    
    for (const prompt of prompts) {
      try {
        const result = await this.evaluate(prompt);
        results.push(result);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Batch evaluation error for prompt:', error);
        results.push('Error in batch evaluation');
      }
    }
    
    return results;
  }
}

/**
 * Anthropic Claude Provider for ContextTransfer Evaluation
 */
export class AnthropicProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(apiKey: string, model: string = 'claude-3-sonnet-20240229', baseURL?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL || 'https://api.anthropic.com/v1';
  }

  async evaluate(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1000,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: `You are an expert L2 English assessment specialist with extensive experience in vocabulary evaluation and second language acquisition research.\n\n${prompt}`
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.content[0]?.text || 'No response generated';
    } catch (error) {
      console.error('Anthropic evaluation error:', error);
      throw new Error(`Failed to evaluate with Anthropic: ${error}`);
    }
  }

  async evaluateBatch(prompts: string[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const prompt of prompts) {
      try {
        const result = await this.evaluate(prompt);
        results.push(result);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error('Batch evaluation error for prompt:', error);
        results.push('Error in batch evaluation');
      }
    }
    
    return results;
  }
}

/**
 * Google Gemini Provider for ContextTransfer Evaluation
 */
export class GeminiProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(apiKey: string, model: string = 'gemini-1.5-pro', baseURL?: string) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async evaluate(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert L2 English assessment specialist with extensive experience in vocabulary evaluation and second language acquisition research.\n\n${prompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 1000,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || 'No response generated';
    } catch (error) {
      console.error('Gemini evaluation error:', error);
      throw new Error(`Failed to evaluate with Gemini: ${error}`);
    }
  }

  async evaluateBatch(prompts: string[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const prompt of prompts) {
      try {
        const result = await this.evaluate(prompt);
        results.push(result);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error('Batch evaluation error for prompt:', error);
        results.push('Error in batch evaluation');
      }
    }
    
    return results;
  }
}

/**
 * Mock Provider for Testing and Development
 */
export class MockLLMProvider implements LLMProvider {
  private responses: Map<string, string>;
  private defaultResponse: string;

  constructor() {
    this.responses = new Map();
    this.defaultResponse = `{
  "collocational": 0.8,
  "syntactic": 0.75,
  "pragmatic": 0.85,
  "semantic": 0.9,
  "fluency": 0.8,
  "explanation": "Mock evaluation: The response demonstrates good understanding with natural word usage and appropriate context. Minor improvements could be made in syntactic complexity."
}`;
    this.initializeMockResponses();
  }

  async evaluate(prompt: string): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check for specific prompt patterns
    for (const [pattern, response] of this.responses) {
      if (prompt.includes(pattern)) {
        return response;
      }
    }
    
    // Return default response with some variation
    const variation = Math.random() * 0.2 - 0.1; // ±0.1 variation
    const mockScores = JSON.parse(this.defaultResponse);
    
    Object.keys(mockScores).forEach(key => {
      if (typeof mockScores[key] === 'number') {
        mockScores[key] = Math.max(0, Math.min(1, mockScores[key] + variation));
      }
    });
    
    return JSON.stringify(mockScores, null, 2);
  }

  async evaluateBatch(prompts: string[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const prompt of prompts) {
      const result = await this.evaluate(prompt);
      results.push(result);
    }
    
    return results;
  }

  // Method to add custom mock responses for testing
  addMockResponse(promptPattern: string, response: string): void {
    this.responses.set(promptPattern, response);
  }

  private initializeMockResponses(): void {
    // High-quality response
    this.responses.set('excellent', `{
  "collocational": 0.95,
  "syntactic": 0.9,
  "pragmatic": 0.95,
  "semantic": 0.98,
  "fluency": 0.92,
  "explanation": "Excellent response demonstrating sophisticated vocabulary usage with natural collocations and perfect contextual understanding."
}`);

    // Poor response
    this.responses.set('poor', `{
  "collocational": 0.3,
  "syntactic": 0.4,
  "pragmatic": 0.25,
  "semantic": 0.35,
  "fluency": 0.3,
  "explanation": "Response shows limited understanding with unnatural word combinations and contextual misuse."
}`);

    // Recognition task response
    this.responses.set('RECOGNITION_MCQ', `{
  "semantic": 0.8,
  "contextual": 0.75,
  "precision": 0.7,
  "explanation": "Good recognition of word meaning with appropriate contextual understanding."
}`);

    // Cloze task response
    this.responses.set('CLOZE_FILL', `{
  "collocational": 0.85,
  "syntactic": 0.8,
  "semantic": 0.9,
  "fluency": 0.82,
  "explanation": "Natural word choice with good grammatical integration and semantic appropriateness."
}`);

    // Generation task response
    this.responses.set('CONSTRAINED_GENERATION', `{
  "collocational": 0.8,
  "syntactic": 0.85,
  "pragmatic": 0.75,
  "semantic": 0.88,
  "fluency": 0.8,
  "explanation": "Creative sentence construction with appropriate word usage and good contextual fit."
}`);

    // Paraphrase task response
    this.responses.set('OPEN_PARAPHRASE', `{
  "collocational": 0.9,
  "syntactic": 0.88,
  "pragmatic": 0.85,
  "semantic": 0.92,
  "fluency": 0.87,
  "transfer": 0.8,
  "explanation": "Sophisticated paraphrasing demonstrating deep understanding and ability to use the word in novel contexts."
}`);
  }
}

/**
 * Provider Factory for Easy Switching
 */
export class LLMProviderFactory {
  static createProvider(
    type: 'openai' | 'anthropic' | 'gemini' | 'mock',
    apiKey?: string,
    model?: string
  ): LLMProvider {
    switch (type) {
      case 'openai':
        if (!apiKey) throw new Error('API key required for OpenAI provider');
        return new OpenAIProvider(apiKey, model);
      
      case 'anthropic':
        if (!apiKey) throw new Error('API key required for Anthropic provider');
        return new AnthropicProvider(apiKey, model);
      
      case 'gemini':
        if (!apiKey) throw new Error('API key required for Gemini provider');
        return new GeminiProvider(apiKey, model);
      
      case 'mock':
        return new MockLLMProvider();
      
      default:
        throw new Error(`Unknown LLM provider type: ${type}`);
    }
  }

  static getAllProviders(apiKeys: Record<string, string>): Record<string, LLMProvider> {
    const providers: Record<string, LLMProvider> = {
      mock: new MockLLMProvider()
    };

    if (apiKeys.openai) {
      providers.openai = new OpenAIProvider(apiKeys.openai);
    }
    
    if (apiKeys.anthropic) {
      providers.anthropic = new AnthropicProvider(apiKeys.anthropic);
    }
    
    if (apiKeys.gemini) {
      providers.gemini = new GeminiProvider(apiKeys.gemini);
    }

    return providers;
  }
}

/**
 * Provider Comparison Utility
 */
export class LLMProviderComparator {
  static async compareProviders(
    providers: Record<string, LLMProvider>,
    testPrompts: string[]
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const [providerName, provider] of Object.entries(providers)) {
      console.log(`Testing provider: ${providerName}`);
      
      const startTime = Date.now();
      const responses: string[] = [];
      const errors: string[] = [];

      for (const prompt of testPrompts) {
        try {
          const response = await provider.evaluate(prompt);
          responses.push(response);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
          responses.push('ERROR');
        }
      }

      const endTime = Date.now();
      const avgResponseTime = (endTime - startTime) / testPrompts.length;

      results[providerName] = {
        totalTime: endTime - startTime,
        avgResponseTime,
        successRate: (responses.length - errors.length) / responses.length,
        errors,
        sampleResponses: responses.slice(0, 3) // First 3 responses as samples
      };
    }

    return results;
  }
}