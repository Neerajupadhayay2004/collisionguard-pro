import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface VoiceCommandsProps {
  onCommand: (command: string, params?: any) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
}

export const useVoiceCommands = ({ onCommand, isListening, setIsListening }: VoiceCommandsProps) => {
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const processCommand = useCallback((transcript: string) => {
    // Navigation commands
    if (transcript.includes('start ride') || transcript.includes('begin ride') || transcript.includes('start driving')) {
      onCommand('START_RIDE');
      speak('Starting ride. Stay safe.');
    } else if (transcript.includes('stop ride') || transcript.includes('end ride') || transcript.includes('stop driving')) {
      onCommand('STOP_RIDE');
      speak('Ride stopped.');
    } else if (transcript.includes('emergency') || transcript.includes('help') || transcript.includes('sos')) {
      onCommand('SOS');
      speak('Sending emergency alert.');
    } else if (transcript.includes('navigate to') || transcript.includes('take me to') || transcript.includes('go to')) {
      const destination = transcript
        .replace('navigate to', '')
        .replace('take me to', '')
        .replace('go to', '')
        .trim();
      onCommand('NAVIGATE', { destination });
      speak(`Setting destination to ${destination}`);
    } else if (transcript.includes('show route') || transcript.includes('show directions')) {
      onCommand('SHOW_ROUTE');
      speak('Showing route.');
    } else if (transcript.includes('clear route') || transcript.includes('cancel navigation')) {
      onCommand('CLEAR_ROUTE');
      speak('Navigation cancelled.');
    } else if (transcript.includes('what is my speed') || transcript.includes('current speed')) {
      onCommand('GET_SPEED');
    } else if (transcript.includes('where am i') || transcript.includes('my location')) {
      onCommand('GET_LOCATION');
    } else if (transcript.includes('safety check') || transcript.includes('am i safe')) {
      onCommand('SAFETY_CHECK');
    } else if (transcript.includes('next turn') || transcript.includes('next direction')) {
      onCommand('NEXT_TURN');
    }
  }, [onCommand]);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    synthRef.current.speak(utterance);
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionConstructor();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();
        console.log('Voice command:', transcript);
        processCommand(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          toast.error('Voice recognition error');
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('Recognition already started');
          }
        }
      };
    }

    synthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [processCommand, isListening]);

  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        recognitionRef.current.start();
        toast.success('Voice commands active');
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    setIsListening(!isListening);
  }, [isListening, setIsListening]);

  return { speak, toggleListening, isSupported: !!recognitionRef.current };
};

export default useVoiceCommands;
