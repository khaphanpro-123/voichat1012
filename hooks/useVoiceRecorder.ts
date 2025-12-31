import { useState, useRef, useCallback } from "react";

interface VoiceRecorderOptions {
  maxDuration?: number; // Maximum recording duration in seconds
  onRecordingComplete?: (audioBlob: Blob, audioBase64: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecorder(options: VoiceRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { maxDuration = 300, onRecordingComplete, onError } = options;

  // Check browser support
  const checkSupport = useCallback(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsSupported(false);
      onError?.("Trình duyệt không hỗ trợ ghi âm");
      return false;
    }
    return true;
  }, [onError]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!checkSupport()) return;

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Create audio URL for playback
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Convert to base64 for API
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          onRecordingComplete?.(blob, base64);
        };
        reader.readAsDataURL(blob);

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        onError?.("Lỗi khi ghi âm");
        stopRecording();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          
          // Auto-stop if max duration reached
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          
          return newTime;
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          onError?.("Vui lòng cho phép truy cập microphone");
        } else if (error.name === 'NotFoundError') {
          onError?.("Không tìm thấy microphone");
        } else {
          onError?.("Không thể bắt đầu ghi âm");
        }
      }
      
      setIsRecording(false);
    }
  }, [checkSupport, maxDuration, onRecordingComplete, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          
          return newTime;
        });
      }, 1000);
    }
  }, [isRecording, isPaused, maxDuration, stopRecording]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      if (isPaused) {
        resumeRecording();
      } else {
        pauseRecording();
      }
    } else {
      startRecording();
    }
  }, [isRecording, isPaused, startRecording, pauseRecording, resumeRecording]);

  // Clear recording
  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [audioUrl]);

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get recording status
  const getRecordingStatus = useCallback(() => {
    if (!isSupported) return 'unsupported';
    if (isRecording && isPaused) return 'paused';
    if (isRecording) return 'recording';
    if (audioBlob) return 'completed';
    return 'idle';
  }, [isSupported, isRecording, isPaused, audioBlob]);

  return {
    // State
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    isSupported,
    
    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    toggleRecording,
    clearRecording,
    
    // Utilities
    formatTime,
    getRecordingStatus,
    formattedTime: formatTime(recordingTime),
    recordingStatus: getRecordingStatus(),
  };
}