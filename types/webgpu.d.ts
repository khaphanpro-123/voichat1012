// Type declarations for WebGPU modules

declare module '@mlc-ai/web-llm' {
  export function CreateMLCEngine(
    modelId: string,
    config?: {
      initProgressCallback?: (report: any) => void;
    }
  ): Promise<any>;
}

declare module '@xenova/transformers' {
  export function pipeline(
    task: string,
    model: string,
    config?: {
      progress_callback?: (progress: any) => void;
    }
  ): Promise<any>;
  
  export const env: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
  };
}

// WebGPU Navigator extension
interface Navigator {
  gpu?: any;
}
