import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Navigation, MapPin, AlertTriangle, ArrowRight, ArrowLeft, ArrowUp, RotateCw, Flag, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Direction {
  instruction: string;
  distance: number;
  duration: number;
  type: string;
  modifier?: string;
  name: string;
}

interface NavigationRouteProps {
  currentLocation: { lat: number; lng: number } | null;
  onRouteCalculated: (coordinates: { lat: number; lng: number }[], dangerZones: any[]) => void;
  destination: string;
  setDestination: (dest: string) => void;
  speak?: (text: string) => void;
}

const NavigationRoute = ({ currentLocation, onRouteCalculated, destination, setDestination, speak }: NavigationRouteProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number; safetyScore: number } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const getDirectionIcon = (type: string, modifier?: string) => {
    if (type === 'turn' && modifier === 'left') return <ArrowLeft className="h-5 w-5" />;
    if (type === 'turn' && modifier === 'right') return <ArrowRight className="h-5 w-5" />;
    if (type === 'roundabout') return <RotateCw className="h-5 w-5" />;
    if (type === 'arrive') return <Flag className="h-5 w-5 text-safe" />;
    return <ArrowUp className="h-5 w-5" />;
  };

  const calculateRoute = async () => {
    if (!currentLocation || !destination) {
      toast.error('Please enter a destination');
      return;
    }

    setIsLoading(true);

    try {
      // Geocode destination using Nominatim (free)
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`
      );
      const geocodeData = await geocodeResponse.json();

      if (!geocodeData || geocodeData.length === 0) {
        toast.error('Destination not found');
        return;
      }

      const endLat = parseFloat(geocodeData[0].lat);
      const endLng = parseFloat(geocodeData[0].lon);

      // Get collision points for safety analysis
      const { data: collisions } = await supabase
        .from('collision_events')
        .select('location_lat, location_lng, severity')
        .order('timestamp', { ascending: false })
        .limit(50);

      const collisionPoints = collisions?.map(c => ({
        lat: c.location_lat,
        lng: c.location_lng,
        severity: c.severity
      })) || [];

      // Get navigation route
      const { data, error } = await supabase.functions.invoke('get-navigation-route', {
        body: {
          startLat: currentLocation.lat,
          startLng: currentLocation.lng,
          endLat,
          endLng,
          collisionPoints
        }
      });

      if (error) throw error;

      setDirections(data.directions || []);
      setRouteInfo({
        distance: data.distance,
        duration: data.duration,
        safetyScore: data.safetyScore
      });
      setCurrentStep(0);
      setIsNavigating(true);

      onRouteCalculated(data.coordinates, data.dangerZones || []);
      
      if (speak) {
        speak(`Route calculated. ${formatDistance(data.distance)} to destination. Safety score: ${data.safetyScore} percent.`);
      }
      
      toast.success('Route calculated!');
    } catch (error) {
      console.error('Error calculating route:', error);
      toast.error('Failed to calculate route');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes} min`;
  };

  const nextStep = () => {
    if (currentStep < directions.length - 1) {
      setCurrentStep(prev => prev + 1);
      if (speak && directions[currentStep + 1]) {
        speak(directions[currentStep + 1].instruction);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const cancelNavigation = () => {
    setIsNavigating(false);
    setDirections([]);
    setRouteInfo(null);
    setDestination('');
    onRouteCalculated([], []);
    if (speak) {
      speak('Navigation cancelled');
    }
  };

  const getSafetyColor = (score: number) => {
    if (score >= 80) return 'text-safe';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <h3 className="font-bold font-mono">Turn-by-Turn Navigation</h3>
          </div>
          {isNavigating && (
            <Button variant="ghost" size="icon" onClick={cancelNavigation}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!isNavigating ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination..."
                className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && calculateRoute()}
              />
              <Button onClick={calculateRoute} disabled={isLoading || !currentLocation}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              </Button>
            </div>
            
            {!currentLocation && (
              <p className="text-xs text-muted-foreground text-center">
                Start a ride to enable navigation
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Route Info */}
            {routeInfo && (
              <div className="grid grid-cols-3 gap-2 bg-muted/50 p-3 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-sm font-bold font-mono">{formatDistance(routeInfo.distance)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-bold font-mono">{formatDuration(routeInfo.duration)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Safety</p>
                  <p className={`text-sm font-bold font-mono ${getSafetyColor(routeInfo.safetyScore)}`}>
                    {routeInfo.safetyScore}%
                  </p>
                </div>
              </div>
            )}

            {/* Current Direction */}
            {directions.length > 0 && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                    {getDirectionIcon(directions[currentStep].type, directions[currentStep].modifier)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{directions[currentStep].instruction}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatDistance(directions[currentStep].distance)} • {directions[currentStep].name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Controls */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStep === 0}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <span className="text-xs font-mono text-muted-foreground">
                Step {currentStep + 1} of {directions.length}
              </span>
              <Button variant="outline" size="sm" onClick={nextStep} disabled={currentStep >= directions.length - 1}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Upcoming Directions */}
            {directions.length > currentStep + 1 && (
              <div className="max-h-32 overflow-y-auto space-y-2">
                <p className="text-xs font-mono text-muted-foreground">Upcoming:</p>
                {directions.slice(currentStep + 1, currentStep + 4).map((dir, idx) => (
                  <div key={idx} className="bg-muted/50 p-2 rounded flex items-center gap-2 text-sm">
                    {getDirectionIcon(dir.type, dir.modifier)}
                    <span className="flex-1 truncate">{dir.instruction}</span>
                    <span className="text-xs text-muted-foreground">{formatDistance(dir.distance)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default NavigationRoute;
