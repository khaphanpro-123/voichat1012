import { useState, useEffect, useCallback } from "react";

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [vietnameseVoice, setVietnameseVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Find Vietnamese voice
      const viVoice = availableVoices.find(
        (voice) =>
          voice.lang.startsWith("vi") || 
          voice.lang.startsWith("vi-VN")
      );

      if (viVoice) {
        setVietnameseVoice(viVoice);
        console.log("✅ Vietnamese voice found:", viVoice.name);
      } else {
        console.warn("⚠️ No Vietnamese voice found. Using default voice.");
        // Use any available voice as fallback
        setVietnameseVoice(availableVoices[0] || null);
      }
    };

    loadVoices();

    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Set Vietnamese voice if available
      if (vietnameseVoice) {
        utterance.voice = vietnameseVoice;
      }

      // Configure speech parameters
      utterance.lang = "vi-VN";
      utterance.rate = 0.9; // Slightly slower for learning
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
      };

      // Speak
      window.speechSynthesis.speak(utterance);
    },
    [vietnameseVoice]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (isSpeaking) {
        stop();
      } else {
        speak(text);
      }
    },
    [isSpeaking, speak, stop]
  );

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    voices,
    vietnameseVoice,
  };
}
