import { useCallback, useRef, useState } from 'react';

interface UseNativeSpeechOptions {
  defaultRate?: number;
  defaultPitch?: number;
  defaultVolume?: number;
  defaultLang?: string;
}

export function useNativeSpeech(options: UseNativeSpeechOptions = {}) {
  const {
    defaultRate = 1.0,
    defaultPitch = 1.0,
    defaultVolume = 1.0,
    defaultLang = 'en-US',
  } = options;

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSpeakingRef = useRef(false);
  const [hasUserInteraction, setHasUserInteraction] = useState(false);

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  // Check if speech synthesis is supported
  const isSupported = useCallback((): boolean => {
    return 'speechSynthesis' in window;
  }, []);

  // Enable speech after user interaction (required by browsers)
  const enableSpeech = useCallback(() => {
    setHasUserInteraction(true);
  }, []);

  // Speak text using Web Speech API (works on native too via WebView)
  const speak = useCallback(async (
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      volume?: number;
      lang?: string;
      voice?: SpeechSynthesisVoice;
    }
  ): Promise<void> => {
    if (!isSupported()) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // On web, speech requires user interaction first
    // Silently fail if no user interaction yet (don't throw errors)
    if (!hasUserInteraction && !isNative()) {
      console.log('Speech deferred - waiting for user interaction');
      return;
    }

    return new Promise((resolve) => {
      try {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options?.rate ?? defaultRate;
        utterance.pitch = options?.pitch ?? defaultPitch;
        utterance.volume = options?.volume ?? defaultVolume;
        utterance.lang = options?.lang ?? defaultLang;

        if (options?.voice) {
          utterance.voice = options.voice;
        }

        utterance.onstart = () => {
          isSpeakingRef.current = true;
        };

        utterance.onend = () => {
          isSpeakingRef.current = false;
          resolve();
        };

        utterance.onerror = (event) => {
          isSpeakingRef.current = false;
          // Don't log common "interrupted" errors - they happen when speech is canceled
          if (event.error !== 'interrupted' && event.error !== 'not-allowed') {
            console.warn('Speech synthesis:', event.error);
          }
          resolve(); // Resolve instead of reject to prevent unhandled promise rejections
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn('Speech synthesis failed:', error);
        resolve();
      }
    });
  }, [isSupported, defaultRate, defaultPitch, defaultVolume, defaultLang, hasUserInteraction]);

  // Stop speaking
  const stop = useCallback((): void => {
    if (isSupported()) {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    }
  }, [isSupported]);

  // Pause speaking
  const pause = useCallback((): void => {
    if (isSupported()) {
      window.speechSynthesis.pause();
    }
  }, [isSupported]);

  // Resume speaking
  const resume = useCallback((): void => {
    if (isSupported()) {
      window.speechSynthesis.resume();
    }
  }, [isSupported]);

  // Get available voices
  const getVoices = useCallback((): SpeechSynthesisVoice[] => {
    if (!isSupported()) return [];
    return window.speechSynthesis.getVoices();
  }, [isSupported]);

  // Check if currently speaking
  const isSpeaking = useCallback((): boolean => {
    if (!isSupported()) return false;
    return window.speechSynthesis.speaking;
  }, [isSupported]);

  // Collision warning voice alert
  const speakCollisionWarning = useCallback(async (
    severity: 'low' | 'medium' | 'high' | 'critical',
    distance: number,
    direction?: string
  ): Promise<void> => {
    const messages = {
      critical: `Critical collision warning! Vehicle ${distance} meters ${direction || 'ahead'}! Brake immediately!`,
      high: `Warning! Vehicle approaching ${distance} meters ${direction || 'ahead'}. Reduce speed.`,
      medium: `Caution. Vehicle detected ${distance} meters ${direction || 'ahead'}.`,
      low: `Vehicle nearby at ${distance} meters.`,
    };

    await speak(messages[severity], {
      rate: severity === 'critical' ? 1.3 : 1.0,
      pitch: severity === 'critical' ? 1.2 : 1.0,
    });
  }, [speak]);

  // Speed limit warning voice alert
  const speakSpeedWarning = useCallback(async (
    currentSpeed: number,
    speedLimit: number
  ): Promise<void> => {
    const overAmount = currentSpeed - speedLimit;
    await speak(
      `Speed warning. You are ${Math.round(overAmount)} kilometers per hour over the limit. Current speed ${Math.round(currentSpeed)}. Limit ${speedLimit}.`,
      { rate: 1.1 }
    );
  }, [speak]);

  // Navigation instruction voice
  const speakNavigation = useCallback(async (instruction: string): Promise<void> => {
    await speak(instruction, { rate: 0.95 });
  }, [speak]);

  // SOS confirmation voice
  const speakSOSConfirmation = useCallback(async (): Promise<void> => {
    await speak(
      'SOS alert activated. Emergency contacts have been notified. Help is on the way.',
      { rate: 0.9, pitch: 0.9 }
    );
  }, [speak]);

  return {
    speak,
    stop,
    pause,
    resume,
    getVoices,
    isSpeaking,
    enableSpeech,
    isSupported: isSupported(),
    isNative: isNative(),
    // Pre-built voice alerts
    speakCollisionWarning,
    speakSpeedWarning,
    speakNavigation,
    speakSOSConfirmation,
  };
}
