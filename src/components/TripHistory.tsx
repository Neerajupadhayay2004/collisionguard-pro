import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { History, MapPin, Gauge, Shield, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Trip {
  id: string;
  vehicle_id: string;
  start_time: string;
  end_time: string | null;
  start_lat: number;
  start_lng: number;
  end_lat: number | null;
  end_lng: number | null;
  total_distance: number;
  max_speed: number;
  avg_speed: number;
  safety_score: number;
  collision_count: number;
}

const TripHistory = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('trip-history-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_history' },
        () => fetchTrips()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTrips = async () => {
    const { data, error } = await supabase
      .from('trip_history')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(20);

    if (!error && data) {
      setTrips(data as Trip[]);
    }
    setIsLoading(false);
  };

  const getSafetyColor = (score: number) => {
    if (score >= 80) return 'text-safe';
    if (score >= 50) return 'text-warning';
    return 'text-danger';
  };

  const getSafetyBg = (score: number) => {
    if (score >= 80) return 'bg-safe/20';
    if (score >= 50) return 'bg-warning/20';
    return 'bg-danger/20';
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'In progress';
    const duration = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="font-bold font-mono">Trip History</h3>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Loading trips...
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No trips recorded yet. Start a ride to track your history.
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {trips.map((trip) => (
              <div 
                key={trip.id}
                className="bg-muted/50 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedTrip(expandedTrip === trip.id ? null : trip.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${getSafetyBg(trip.safety_score)} flex items-center justify-center`}>
                      <Shield className={`h-5 w-5 ${getSafetyColor(trip.safety_score)}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">
                        {format(new Date(trip.start_time), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {format(new Date(trip.start_time), 'HH:mm')} • {formatDuration(trip.start_time, trip.end_time)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold font-mono ${getSafetyColor(trip.safety_score)}`}>
                      {trip.safety_score}%
                    </span>
                    {expandedTrip === trip.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {expandedTrip === trip.id && (
                  <div className="px-3 pb-3 space-y-3 animate-fade-in border-t border-border/50 pt-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-background p-2 rounded text-center">
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="text-sm font-bold font-mono">{trip.total_distance.toFixed(2)} km</p>
                      </div>
                      <div className="bg-background p-2 rounded text-center">
                        <p className="text-xs text-muted-foreground">Max Speed</p>
                        <p className="text-sm font-bold font-mono">{trip.max_speed.toFixed(0)} km/h</p>
                      </div>
                      <div className="bg-background p-2 rounded text-center">
                        <p className="text-xs text-muted-foreground">Avg Speed</p>
                        <p className="text-sm font-bold font-mono">{trip.avg_speed.toFixed(0)} km/h</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">
                          {trip.start_lat.toFixed(4)}, {trip.start_lng.toFixed(4)}
                        </span>
                      </div>
                      {trip.collision_count > 0 && (
                        <span className="text-danger font-mono">
                          {trip.collision_count} collision{trip.collision_count > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TripHistory;
