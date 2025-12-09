import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Route, Lightbulb, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SafeRouteAIProps {
  currentLocation: { lat: number; lng: number } | null;
}

interface RouteData {
  suggestion: string;
  safetyTips: string[];
  riskLevel: 'low' | 'medium' | 'high';
  avoidAreas: { lat: number; lng: number; reason: string }[];
}

const SafeRouteAI = ({ currentLocation }: SafeRouteAIProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [destination, setDestination] = useState('');

  const getSafeRoute = async () => {
    if (!currentLocation) {
      toast.error('Location not available');
      return;
    }

    setIsLoading(true);

    try {
      // Fetch recent collision history
      const { data: collisions } = await supabase
        .from('collision_events')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      const { data, error } = await supabase.functions.invoke('suggest-safe-route', {
        body: {
          currentLat: currentLocation.lat,
          currentLng: currentLocation.lng,
          destination,
          collisionHistory: collisions || []
        }
      });

      if (error) throw error;

      setRouteData(data);
      toast.success('AI route suggestion generated!');
    } catch (error) {
      console.error('Error getting safe route:', error);
      toast.error('Failed to get route suggestion');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-safe';
      case 'medium': return 'text-warning';
      case 'high': return 'text-danger';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          <h3 className="font-bold font-mono">AI Safe Route</h3>
        </div>

        <div className="space-y-2">
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter destination (optional)"
            className="w-full px-3 py-2 bg-muted rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
          
          <Button 
            onClick={getSafeRoute} 
            disabled={isLoading || !currentLocation}
            className="w-full font-mono"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Get AI Suggestion
              </>
            )}
          </Button>
        </div>

        {routeData && (
          <div className="space-y-3 animate-fade-in">
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground">Risk Level</span>
                <span className={`text-sm font-bold font-mono uppercase ${getRiskColor(routeData.riskLevel)}`}>
                  {routeData.riskLevel}
                </span>
              </div>
              <p className="text-sm">{routeData.suggestion}</p>
            </div>

            {routeData.safetyTips.length > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-xs font-mono text-muted-foreground mb-2">Safety Tips</p>
                <ul className="space-y-1">
                  {routeData.safetyTips.map((tip, index) => (
                    <li key={index} className="text-xs flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {routeData.avoidAreas.length > 0 && (
              <div className="bg-danger/10 p-3 rounded-lg border border-danger/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-danger" />
                  <p className="text-xs font-mono text-danger">Areas to Avoid</p>
                </div>
                <ul className="space-y-1">
                  {routeData.avoidAreas.map((area, index) => (
                    <li key={index} className="text-xs flex items-start gap-2">
                      <MapPin className="h-3 w-3 text-danger mt-0.5" />
                      {area.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SafeRouteAI;
