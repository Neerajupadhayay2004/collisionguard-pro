import { useCallback, useRef, useState, useEffect } from 'react';

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

  // Auto-enable speech on ANY user interaction (click/tap/key)
  useEffect(() => {
    if (hasUserInteraction) return;
    
    const unlock = () => {
      setHasUserInteraction(true);
      // Warm up speech synthesis so it's ready
      if ('speechSynthesis' in window) {
        const warmup = new SpeechSynthesisUtterance('');
        warmup.volume = 0;
        window.speechSynthesis.speak(warmup);
        window.speechSynthesis.cancel();
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [hasUserInteraction]);

  // Check if speech synthesis is supported
  const isSupported = useCallback((): boolean => {
    return 'speechSynthesis' in window;
  }, []);

  // Enable speech manually (kept for backward compat)
  const enableSpeech = useCallback(() => {
    setHasUserInteraction(true);
  }, []);

  // Speak text using Web Speech API
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
      console.warn('[Speech] Not supported in this browser');
      return;
    }

    if (!hasUserInteraction && !isNative()) {
      console.log('[Speech] Waiting for user interaction - will auto-enable on first click');
      return;
    }

    console.log('[Speech] Speaking:', text.substring(0, 50) + '...');

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
          console.log('[Speech] Started speaking');
          isSpeakingRef.current = true;
        };

        utterance.onend = () => {
          console.log('[Speech] Finished speaking');
          isSpeakingRef.current = false;
          resolve();
        };

        utterance.onerror = (event) => {
          isSpeakingRef.current = false;
          if (event.error !== 'interrupted' && event.error !== 'not-allowed') {
            console.warn('[Speech] Error:', event.error);
          }
          resolve();
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);

        // Chrome bug fix: speech synthesis stops after ~15s
        // Keep it alive with periodic resume calls
        const keepAlive = setInterval(() => {
          if (!window.speechSynthesis.speaking) {
            clearInterval(keepAlive);
            return;
          }
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }, 10000);

        utterance.onend = () => {
          clearInterval(keepAlive);
          isSpeakingRef.current = false;
          resolve();
        };
      } catch (error) {
        console.warn('[Speech] Failed:', error);
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

  // Collision warning voice alert - LOUD and repeated
  const speakCollisionWarning = useCallback(async (
    severity: 'low' | 'medium' | 'high' | 'critical',
    distance: number,
    direction?: string
  ): Promise<void> => {
    const messages = {
      critical: `DANGER! DANGER! Critical collision warning! Vehicle ${distance} meters ${direction || 'ahead'}! Brake immediately! Brake now!`,
      high: `WARNING! WARNING! Vehicle approaching ${distance} meters ${direction || 'ahead'}! Reduce speed now!`,
      medium: `Caution! Vehicle detected ${distance} meters ${direction || 'ahead'}. Stay alert.`,
      low: `Vehicle nearby at ${distance} meters.`,
    };

    // Speak with max volume, louder for critical
    await speak(messages[severity], {
      rate: severity === 'critical' ? 1.2 : severity === 'high' ? 1.1 : 1.0,
      pitch: severity === 'critical' ? 1.3 : severity === 'high' ? 1.1 : 1.0,
      volume: 1.0,
    });

    // Repeat critical and high warnings after a short delay
    if (severity === 'critical' || severity === 'high') {
      setTimeout(async () => {
        await speak(messages[severity], {
          rate: 1.1,
          pitch: 1.2,
          volume: 1.0,
        });
      }, 3000);
    }
  }, [speak]);

  // Speed limit warning voice alert - LOUD
  const speakSpeedWarning = useCallback(async (
    currentSpeed: number,
    speedLimit: number
  ): Promise<void> => {
    const overAmount = currentSpeed - speedLimit;
    await speak(
      `Speed warning! You are ${Math.round(overAmount)} kilometers per hour over the limit! Current speed ${Math.round(currentSpeed)}. Limit ${speedLimit}. Slow down now!`,
      { rate: 1.1, volume: 1.0, pitch: 1.1 }
    );
  }, [speak]);

  // Navigation instruction voice
  const speakNavigation = useCallback(async (instruction: string): Promise<void> => {
    await speak(instruction, { rate: 0.95 });
  }, [speak]);

  // SOS confirmation voice - LOUD and repeated
  const speakSOSConfirmation = useCallback(async (): Promise<void> => {
    await speak(
      'SOS alert activated! Emergency contacts have been notified! Help is on the way!',
      { rate: 0.95, pitch: 1.0, volume: 1.0 }
    );
    // Repeat SOS confirmation
    setTimeout(async () => {
      await speak(
        'Emergency SOS is active. Stay calm. Help is coming.',
        { rate: 0.9, volume: 1.0 }
      );
    }, 4000);
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
