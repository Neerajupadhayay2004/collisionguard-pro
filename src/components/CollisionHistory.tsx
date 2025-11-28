import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, MapPin, Clock, Gauge } from 'lucide-react';

interface CollisionEvent {
  id: string;
  timestamp: string;
  location_lat: number;
  location_lng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  relative_speed: number;
  distance: number;
}

const CollisionHistory = () => {
  const [events, setEvents] = useState<CollisionEvent[]>([]);

  useEffect(() => {
    fetchEvents();

    const channel = supabase
      .channel('collision-events-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collision_events'
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('collision_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching events:', error);
      return;
    }

    setEvents((data || []) as CollisionEvent[]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'text-danger';
      case 'medium':
        return 'text-warning';
      default:
        return 'text-safe';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'bg-danger/10 border-danger/30';
      case 'medium':
        return 'bg-warning/10 border-warning/30';
      default:
        return 'bg-safe/10 border-safe/30';
    }
  };

  return (
    <Card className="p-6 h-full">
      <h3 className="text-lg font-bold font-mono mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        Recent Collision Events
      </h3>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No collision events detected
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border ${getSeverityBg(event.severity)} transition-all hover:scale-[1.02]`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs font-mono font-bold uppercase ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono">{event.relative_speed.toFixed(1)} km/h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono text-xs">
                      {event.location_lat.toFixed(4)}, {event.location_lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Distance: {event.distance.toFixed(1)}m
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default CollisionHistory;
