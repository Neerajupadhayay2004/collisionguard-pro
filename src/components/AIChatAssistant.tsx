import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Bot, Send, X, Minimize2, Maximize2, Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatAssistantProps {
  currentSpeed?: number;
  isRideActive?: boolean;
  currentLocation?: { lat: number; lng: number } | null;
  safetyScore?: number;
  collisionWarnings?: number;
  weatherCondition?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const AIChatAssistant = ({
  currentSpeed = 0,
  isRideActive = false,
  currentLocation = null,
  safetyScore = 100,
  collisionWarnings = 0,
  weatherCondition = 'Unknown',
}: AIChatAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '👋 Hi! I\'m **SafeGuard AI**, your driving safety assistant. Ask me about:\n\n• 🛡️ Safety tips\n• 🗺️ Route advice\n• 🌧️ Weather impact\n• 🚨 Emergency help\n• 😴 Fatigue management\n\nHow can I help you stay safe?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice input setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionCtor();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      toast.error('Voice input not supported');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    const allMessages = [...messages, userMsg];

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > 1 && prev[prev.length - 2]?.role === 'user') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          context: {
            speed: currentSpeed,
            rideActive: isRideActive,
            location: currentLocation,
            safetyScore,
            warnings: collisionWarnings,
            weather: weatherCondition,
          },
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error('Rate limited. Try again shortly.');
        else if (resp.status === 402) toast.error('AI credits exhausted.');
        else toast.error('Failed to get response');
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
      toast.error('Connection error');
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, currentSpeed, isRideActive, currentLocation, safetyScore, collisionWarnings, weatherCondition]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 z-50 bg-primary text-primary-foreground p-4 rounded-full shadow-lg hover:scale-110 transition-transform animate-bounce"
        aria-label="Open AI Assistant"
      >
        <Bot className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed z-50 transition-all duration-300",
      isMinimized
        ? "bottom-20 right-6 w-64"
        : "bottom-4 right-4 left-4 sm:left-auto sm:w-[400px] sm:bottom-6 sm:right-6"
    )}>
      <Card className="flex flex-col overflow-hidden border-primary/30 shadow-2xl bg-card">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-border">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-mono font-bold text-sm">SafeGuard AI</span>
            <span className="w-2 h-2 rounded-full bg-safe animate-pulse" />
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-muted rounded">
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-muted rounded">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[50vh] sm:max-h-[400px] scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  )}>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <button
                  onClick={toggleVoice}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isListening ? "bg-danger text-danger-foreground animate-pulse" : "bg-muted text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask SafeGuard AI..."
                  className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button size="icon" onClick={sendMessage} disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AIChatAssistant;
