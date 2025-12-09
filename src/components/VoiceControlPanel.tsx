import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceControlPanelProps {
  isListening: boolean;
  toggleListening: () => void;
  isSupported: boolean;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

const VoiceControlPanel = ({ 
  isListening, 
  toggleListening, 
  isSupported,
  isMuted,
  setIsMuted
}: VoiceControlPanelProps) => {
  
  const handleToggleListening = () => {
    if (!isSupported) {
      toast.error('Voice commands not supported in this browser');
      return;
    }
    toggleListening();
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <h3 className="font-bold font-mono">Voice Control</h3>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleToggleListening}
            className={`flex-1 ${isListening ? 'bg-danger hover:bg-danger/90' : ''}`}
            disabled={!isSupported}
          >
            {isListening ? (
              <>
                <MicOff className="mr-2 h-4 w-4" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Start Listening
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>

        {isListening && (
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg animate-pulse">
            <p className="text-xs text-center font-mono text-primary">🎤 Listening for commands...</p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-mono text-muted-foreground">Voice Commands:</p>
          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
            <div className="bg-muted/50 p-2 rounded">"Start ride"</div>
            <div className="bg-muted/50 p-2 rounded">"Stop ride"</div>
            <div className="bg-muted/50 p-2 rounded">"Navigate to [place]"</div>
            <div className="bg-muted/50 p-2 rounded">"Emergency / SOS"</div>
            <div className="bg-muted/50 p-2 rounded">"Next turn"</div>
            <div className="bg-muted/50 p-2 rounded">"What is my speed"</div>
            <div className="bg-muted/50 p-2 rounded">"Clear route"</div>
            <div className="bg-muted/50 p-2 rounded">"Safety check"</div>
          </div>
        </div>

        {!isSupported && (
          <p className="text-xs text-center text-danger">
            Voice commands not supported in this browser
          </p>
        )}
      </div>
    </Card>
  );
};

export default VoiceControlPanel;
