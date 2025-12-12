import { Card } from './ui/card';
import { Button } from './ui/button';
import { Activity, Smartphone, AlertTriangle, Compass } from 'lucide-react';
import { useMotionSensor } from '@/hooks/useMotionSensor';
import { cn } from '@/lib/utils';

interface MotionSensorDisplayProps {
  isRideActive: boolean;
  onCollisionDetected?: (result: any) => void;
  onSpeak?: (message: string) => void;
}

const MotionSensorDisplay = ({ 
  isRideActive, 
  onCollisionDetected,
  onSpeak 
}: MotionSensorDisplayProps) => {
  const {
    isListening,
    startListening,
    stopListening,
    acceleration,
    orientation,
    gForce,
    lastCollision,
    isNative,
  } = useMotionSensor({
    enableCollisionDetection: isRideActive,
    collisionThreshold: 2.5,
    onCollisionDetected,
    onSpeak,
  });

  const getGForceColor = (g: number) => {
    if (g >= 3) return 'text-danger';
    if (g >= 2) return 'text-warning';
    if (g >= 1) return 'text-primary';
    return 'text-safe';
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="font-bold font-mono text-sm">Motion Sensors</h3>
            {isNative && (
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                NATIVE
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant={isListening ? "destructive" : "default"}
            onClick={isListening ? stopListening : startListening}
          >
            {isListening ? 'Stop' : 'Start'}
          </Button>
        </div>

        {isListening ? (
          <div className="space-y-3">
            {/* G-Force Display */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground">G-Force</span>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className={cn(
                "text-2xl font-bold font-mono",
                getGForceColor(gForce)
              )}>
                {gForce.toFixed(2)}G
              </p>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-200",
                    gForce >= 3 ? 'bg-danger' : 
                    gForce >= 2 ? 'bg-warning' : 
                    gForce >= 1 ? 'bg-primary' : 'bg-safe'
                  )}
                  style={{ width: `${Math.min(gForce * 20, 100)}%` }}
                />
              </div>
            </div>

            {/* Acceleration */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/30 p-2 rounded text-center">
                <p className="text-[10px] text-muted-foreground font-mono">X</p>
                <p className="text-sm font-mono font-medium">
                  {acceleration.x.toFixed(1)}
                </p>
              </div>
              <div className="bg-muted/30 p-2 rounded text-center">
                <p className="text-[10px] text-muted-foreground font-mono">Y</p>
                <p className="text-sm font-mono font-medium">
                  {acceleration.y.toFixed(1)}
                </p>
              </div>
              <div className="bg-muted/30 p-2 rounded text-center">
                <p className="text-[10px] text-muted-foreground font-mono">Z</p>
                <p className="text-sm font-mono font-medium">
                  {acceleration.z.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Compass className="h-3 w-3" />
              <span className="font-mono">
                α:{orientation.alpha.toFixed(0)}° β:{orientation.beta.toFixed(0)}° γ:{orientation.gamma.toFixed(0)}°
              </span>
            </div>

            {/* Last Collision */}
            {lastCollision && (
              <div className="bg-danger/10 border border-danger/20 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-danger" />
                  <span className="text-xs font-bold text-danger uppercase">
                    {lastCollision.severity} Impact
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {lastCollision.impactForce.toFixed(1)}G from {lastCollision.direction}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(lastCollision.timestamp).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Tap Start to enable motion detection</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MotionSensorDisplay;
