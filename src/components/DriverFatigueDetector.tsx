import { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, AlertTriangle, Coffee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DriverFatigueDetectorProps {
  isRideActive: boolean;
  onSpeak?: (message: string) => void;
}

const DriverFatigueDetector = ({ isRideActive, onSpeak }: DriverFatigueDetectorProps) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [fatigueLevel, setFatigueLevel] = useState(0); // 0-100
  const [eyesClosed, setEyesClosed] = useState(false);
  const [eyeClosedDuration, setEyeClosedDuration] = useState(0);
  const [blinkRate, setBlinkRate] = useState(15); // blinks per minute
  const [lastAlert, setLastAlert] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play alert sound
  const playAlertSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1);
    } catch (error) {
      console.error('Failed to play alert:', error);
    }
  }, []);

  // Start camera monitoring
  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsMonitoring(true);
      toast.success('Fatigue monitoring started');
    } catch (error) {
      toast.error('Camera access required for fatigue detection');
    }
  };

  // Stop monitoring
  const stopMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsMonitoring(false);
    setFatigueLevel(0);
    setEyesClosed(false);
    setEyeClosedDuration(0);
  };

  // Simulate fatigue detection (in production, use ML model)
  useEffect(() => {
    if (!isMonitoring || !isRideActive) return;

    const interval = setInterval(() => {
      // Simulate eye state detection
      const isEyesClosed = Math.random() < 0.1; // 10% chance eyes closed
      setEyesClosed(isEyesClosed);

      if (isEyesClosed) {
        setEyeClosedDuration(prev => prev + 1);
      } else {
        setEyeClosedDuration(0);
      }

      // Simulate blink rate (normal: 15-20, fatigued: <10)
      const newBlinkRate = 15 - Math.random() * 5 + (fatigueLevel > 50 ? -5 : 0);
      setBlinkRate(Math.max(5, Math.min(25, newBlinkRate)));

      // Calculate fatigue level
      let newFatigue = fatigueLevel;
      
      if (isEyesClosed) {
        newFatigue += 2;
      } else {
        newFatigue = Math.max(0, newFatigue - 0.5);
      }
      
      if (blinkRate < 10) {
        newFatigue += 1;
      }
      
      setFatigueLevel(Math.min(100, Math.max(0, newFatigue)));

      // Trigger alert if fatigue level is high
      if (newFatigue > 60 && Date.now() - lastAlert > 30000) {
        setLastAlert(Date.now());
        playAlertSound();
        toast.warning('⚠️ Fatigue Detected!', {
          description: 'Consider taking a break',
          duration: 10000,
        });
        if (onSpeak) {
          onSpeak('Warning! Fatigue detected. Please consider taking a break.');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, isRideActive, fatigueLevel, blinkRate, lastAlert, playAlertSound, onSpeak]);

  // Auto-stop when ride ends
  useEffect(() => {
    if (!isRideActive && isMonitoring) {
      stopMonitoring();
    }
  }, [isRideActive, isMonitoring]);

  const getFatigueColor = () => {
    if (fatigueLevel < 30) return 'bg-safe';
    if (fatigueLevel < 60) return 'bg-warning';
    return 'bg-danger';
  };

  const getFatigueStatus = () => {
    if (fatigueLevel < 30) return { label: 'Alert', color: 'text-safe' };
    if (fatigueLevel < 60) return { label: 'Mild Fatigue', color: 'text-warning' };
    return { label: 'High Fatigue', color: 'text-danger' };
  };

  const status = getFatigueStatus();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono flex items-center gap-2">
          <Coffee className="h-4 w-4 text-warning" />
          Driver Fatigue Detection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Camera Preview */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {isMonitoring ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                <span className="text-[10px] text-danger font-mono">LIVE</span>
              </div>
              {eyesClosed && (
                <div className="absolute inset-0 bg-danger/30 flex items-center justify-center animate-pulse">
                  <EyeOff className="h-8 w-8 text-danger" />
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Eye className="h-8 w-8 mb-2" />
              <span className="text-xs font-mono">Camera Off</span>
            </div>
          )}
        </div>

        {/* Fatigue Meter */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-muted-foreground">Fatigue Level</span>
            <span className={cn("text-xs font-bold font-mono", status.color)}>
              {status.label}
            </span>
          </div>
          <Progress 
            value={fatigueLevel} 
            className={cn("h-2", getFatigueColor())}
          />
        </div>

        {/* Stats */}
        {isMonitoring && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground">Blink Rate</span>
              <p className="font-mono font-bold">{blinkRate.toFixed(0)}/min</p>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <span className="text-muted-foreground">Eye Status</span>
              <p className={cn("font-mono font-bold", eyesClosed ? "text-danger" : "text-safe")}>
                {eyesClosed ? 'Closed' : 'Open'}
              </p>
            </div>
          </div>
        )}

        {/* Control Button */}
        <Button
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          variant={isMonitoring ? "outline" : "default"}
          size="sm"
          className="w-full"
          disabled={!isRideActive}
        >
          {isMonitoring ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Stop Monitoring
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Start Monitoring
            </>
          )}
        </Button>

        {!isRideActive && (
          <p className="text-[10px] text-muted-foreground text-center">
            Start a ride to enable fatigue detection
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverFatigueDetector;
