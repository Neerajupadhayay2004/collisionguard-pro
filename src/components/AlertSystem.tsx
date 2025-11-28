import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Volume2 } from 'lucide-react';
import { Button } from './ui/button';

interface AlertLog {
  id: string;
  alert_type: string;
  message: string;
  triggered_at: string;
}

const AlertSystem = () => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<AlertLog[]>([]);

  useEffect(() => {
    // Subscribe to collision events for alerts
    const channel = supabase
      .channel('collision-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collision_events'
        },
        async (payload: any) => {
          const event = payload.new;
          await handleCollisionAlert(event);
        }
      )
      .subscribe();

    // Subscribe to alert logs
    const alertChannel = supabase
      .channel('alert-logs-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alert_logs'
        },
        () => {
          fetchRecentAlerts();
        }
      )
      .subscribe();

    fetchRecentAlerts();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(alertChannel);
    };
  }, [isAudioEnabled]);

  const fetchRecentAlerts = async () => {
    const { data } = await supabase
      .from('alert_logs')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(5);

    if (data) {
      setRecentAlerts(data);
    }
  };

  const handleCollisionAlert = async (event: any) => {
    const severity = event.severity;
    const message = `${severity.toUpperCase()} COLLISION RISK! Speed: ${event.relative_speed.toFixed(1)} km/h`;

    // Show visual alert
    toast.error(message, {
      duration: 5000,
      icon: <Bell className="h-5 w-5" />,
    });

    // Generate audio alert using Gemini
    if (isAudioEnabled) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-audio-alert', {
          body: { severity, speed: event.relative_speed, distance: event.distance }
        });

        if (!error && data?.audioBase64) {
          playAudioAlert(data.audioBase64);
        }
      } catch (error) {
        console.error('Error generating audio alert:', error);
      }
    }

    // Log the alert
    await supabase.from('alert_logs').insert({
      collision_event_id: event.id,
      alert_type: isAudioEnabled ? 'audio' : 'visual',
      message
    });
  };

  const playAudioAlert = async (base64Audio: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioData = atob(base64Audio);
      const arrayBuffer = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        arrayBuffer[i] = audioData.charCodeAt(i);
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    toast.success(`Audio alerts ${!isAudioEnabled ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        variant={isAudioEnabled ? "default" : "outline"}
        onClick={toggleAudio}
        className="rounded-full shadow-lg font-mono"
      >
        <Volume2 className={`h-5 w-5 mr-2 ${isAudioEnabled ? 'animate-pulse' : ''}`} />
        {isAudioEnabled ? 'Audio ON' : 'Audio OFF'}
      </Button>
    </div>
  );
};

export default AlertSystem;
