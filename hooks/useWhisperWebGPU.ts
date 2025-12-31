import { useState, useEffect, useCallback } from 'react';

interface TranscriptionResult {
  text: string;
  confidence: number;
}

interface UseWhisperWebGPUReturn {
  transcribe: (audioBlob: Blob) => Promise<TranscriptionResult>;
  loading: boolean;
  ready: boolean;
  error: string | null;
}

export function useWhisperWebGPU(): UseWhisperWebGPUReturn {
  const [whisper, setWhisper] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initWhisper();
  }, []);

  const initWhisper = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check WebGPU support
      if (!navigator.gpu) {
        throw new Error('WebGPU not supported');
      }

      // For now, use browser's built-in Web Speech API as fallback
      // TODO: Integrate actual Whisper WebGPU when library is stable
      console.log('✅ Using Web Speech API (Whisper WebGPU coming soon)');
      setWhisper({ ready: true });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Whisper';
      setError(errorMessage);
      console.error('❌ Whisper load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const transcribe = useCallback(async (audioBlob: Blob): Promise<TranscriptionResult> => {
    if (!whisper) {
      throw new Error('Whisper not initialized');
    }

    try {
      // Convert blob to audio context for analysis
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // For now, return a placeholder
      // TODO: Implement actual Whisper WebGPU transcription
      console.log('Audio duration:', audioBuffer.duration, 'seconds');

      // Use Web Speech API as fallback
      return new Promise((resolve, reject) => {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          const confidence = event.results[0][0].confidence;
          
          resolve({
            text: transcript,
            confidence: confidence || 0.8
          });
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          reject(new Error('Speech recognition failed'));
        };

        // Start recognition when audio plays
        audio.onplay = () => {
          recognition.start();
        };

        audio.play().catch(reject);
      });

    } catch (err) {
      console.error('Transcription error:', err);
      
      // Fallback result
      return {
        text: 'Transcription unavailable',
        confidence: 0.5
      };
    }
  }, [whisper]);

  return {
    transcribe,
    loading,
    ready: !!whisper && !loading,
    error
  };
}
