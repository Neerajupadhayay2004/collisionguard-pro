import { Car, AlertTriangle, Radio, Navigation, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TrackedVehicle {
  id: string;
  vehicle_id: string;
  current_lat: number;
  current_lng: number;
  speed: number;
  distance?: number;
  relativeSpeed?: number;
  status: string;
}

interface CollisionWarning {
  id: string;
  vehicleId: string;
  distance: number;
  relativeSpeed: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

interface TrafficUpdate {
  id: string;
  type: 'congestion' | 'accident' | 'roadwork' | 'hazard';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface RealtimePanelProps {
  nearbyVehicles: TrackedVehicle[];
  collisionWarnings: CollisionWarning[];
  trafficUpdates: TrafficUpdate[];
  isConnected: boolean;
}

const RealtimePanel = ({
  nearbyVehicles,
  collisionWarnings,
  trafficUpdates,
  isConnected,
}: RealtimePanelProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-danger bg-danger/20 border-danger';
      case 'high': return 'text-danger bg-danger/10 border-danger/50';
      case 'medium': return 'text-warning bg-warning/10 border-warning/50';
      default: return 'text-safe bg-safe/10 border-safe/50';
    }
  };

  const getTrafficIcon = (type: string) => {
    switch (type) {
      case 'accident': return <AlertTriangle className="h-4 w-4 text-danger" />;
      case 'congestion': return <Car className="h-4 w-4 text-warning" />;
      case 'roadwork': return <Navigation className="h-4 w-4 text-warning" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-mono flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            Real-time Tracking
          </span>
          <span className={cn(
            "flex items-center gap-1 text-xs",
            isConnected ? "text-safe" : "text-muted-foreground"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-safe animate-pulse" : "bg-muted"
            )} />
            {isConnected ? 'Live' : 'Connecting...'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Collision Warnings */}
        {collisionWarnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Collision Warnings
            </h4>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {collisionWarnings.slice(0, 3).map(warning => (
                  <div
                    key={warning.id}
                    className={cn(
                      "p-2 rounded border text-xs font-mono",
                      getSeverityColor(warning.severity)
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold uppercase">{warning.severity}</span>
                      <span>{warning.distance.toFixed(0)}m</span>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      Relative speed: {warning.relativeSpeed.toFixed(0)} km/h
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Nearby Vehicles */}
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Car className="h-3 w-3" />
            Nearby Vehicles ({nearbyVehicles.length})
          </h4>
          <ScrollArea className="h-28">
            {nearbyVehicles.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No vehicles detected nearby</p>
            ) : (
              <div className="space-y-1">
                {nearbyVehicles.slice(0, 5).map(vehicle => (
                  <div
                    key={vehicle.id}
                    className="flex items-center justify-between p-2 rounded bg-secondary/30 border border-border text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <Car className={cn(
                        "h-3 w-3",
                        vehicle.status === 'danger' ? 'text-danger' :
                        vehicle.status === 'warning' ? 'text-warning' : 'text-safe'
                      )} />
                      <span>{vehicle.vehicle_id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{vehicle.distance?.toFixed(0)}m</span>
                      <span>{vehicle.speed.toFixed(0)} km/h</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Traffic Updates */}
        {trafficUpdates.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              Traffic Updates
            </h4>
            <div className="space-y-1">
              {trafficUpdates.map(update => (
                <div
                  key={update.id}
                  className="flex items-center gap-2 p-2 rounded bg-secondary/30 border border-border text-xs font-mono"
                >
                  {getTrafficIcon(update.type)}
                  <span className="flex-1">{update.description}</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] uppercase",
                    update.severity === 'high' ? 'bg-danger/20 text-danger' :
                    update.severity === 'medium' ? 'bg-warning/20 text-warning' :
                    'bg-safe/20 text-safe'
                  )}>
                    {update.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealtimePanel;
