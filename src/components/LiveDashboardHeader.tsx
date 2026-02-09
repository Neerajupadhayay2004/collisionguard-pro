import { Activity, Shield, Gauge, AlertTriangle, Zap, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveDashboardHeaderProps {
  currentSpeed: number;
  safetyScore: number;
  isRideActive: boolean;
  nearbyVehicles: number;
  collisionWarnings: number;
  isConnected: boolean;
}

const LiveDashboardHeader = ({
  currentSpeed,
  safetyScore,
  isRideActive,
  nearbyVehicles,
  collisionWarnings,
  isConnected,
}: LiveDashboardHeaderProps) => {
  if (!isRideActive) return null;

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-3 mb-4 animate-fade-in">
      <div className="flex items-center gap-1 mb-2">
        <Zap className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-wider">Live Dashboard</span>
        <span className={cn("ml-auto w-2 h-2 rounded-full", isConnected ? "bg-safe animate-pulse" : "bg-danger")} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <Gauge className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className={cn(
            "text-lg font-bold font-mono",
            currentSpeed > 80 ? "text-danger" : currentSpeed > 50 ? "text-warning" : "text-safe"
          )}>
            {currentSpeed.toFixed(0)}
          </p>
          <p className="text-[8px] text-muted-foreground">km/h</p>
        </div>
        <div className="text-center">
          <Shield className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className={cn(
            "text-lg font-bold font-mono",
            safetyScore >= 80 ? "text-safe" : safetyScore >= 50 ? "text-warning" : "text-danger"
          )}>
            {safetyScore.toFixed(0)}%
          </p>
          <p className="text-[8px] text-muted-foreground">Safety</p>
        </div>
        <div className="text-center">
          <Activity className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-lg font-bold font-mono text-primary">{nearbyVehicles}</p>
          <p className="text-[8px] text-muted-foreground">Nearby</p>
        </div>
        <div className="text-center">
          <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className={cn(
            "text-lg font-bold font-mono",
            collisionWarnings > 0 ? "text-danger animate-pulse" : "text-safe"
          )}>
            {collisionWarnings}
          </p>
          <p className="text-[8px] text-muted-foreground">Alerts</p>
        </div>
      </div>
    </div>
  );
};

export default LiveDashboardHeader;
