import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Flame, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface CollisionEvent {
  id: string;
  location_lat: number;
  location_lng: number;
  severity: string;
  timestamp: string;
}

interface AccidentHeatmapProps {
  currentLocation: { lat: number; lng: number } | null;
}

const AccidentHeatmap = ({ currentLocation }: AccidentHeatmapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const heatLayerRef = useRef<L.CircleMarker[]>([]);
  const [events, setEvents] = useState<CollisionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch collision events
  const fetchEvents = async () => {
    setIsLoading(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('collision_events')
      .select('*')
      .gte('timestamp', thirtyDaysAgo)
      .order('timestamp', { ascending: false });

    if (!error && data) {
      setEvents(data);
    }
    setIsLoading(false);
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = currentLocation || { lat: 28.6139, lng: 77.2090 };
    mapRef.current = L.map(mapContainerRef.current).setView([center.lat, center.lng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(mapRef.current);

    fetchEvents();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update heatmap when events change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    heatLayerRef.current.forEach(marker => marker.remove());
    heatLayerRef.current = [];

    // Add heat circles for each event
    events.forEach(event => {
      const color = event.severity === 'critical' ? '#ef4444' : 
                    event.severity === 'high' ? '#f97316' : 
                    event.severity === 'medium' ? '#f59e0b' : '#22c55e';
      
      const radius = event.severity === 'critical' ? 40 : 
                     event.severity === 'high' ? 30 : 
                     event.severity === 'medium' ? 20 : 15;

      const circle = L.circleMarker([event.location_lat, event.location_lng], {
        radius,
        fillColor: color,
        fillOpacity: 0.4,
        color: color,
        weight: 1,
        opacity: 0.6,
      }).addTo(mapRef.current!);

      circle.bindPopup(`
        <div class="text-xs font-mono p-1">
          <strong class="capitalize">${event.severity}</strong><br/>
          ${new Date(event.timestamp).toLocaleDateString()}
        </div>
      `);

      heatLayerRef.current.push(circle);
    });

    // Update map center
    if (currentLocation && mapRef.current) {
      mapRef.current.setView([currentLocation.lat, currentLocation.lng], 13);
    }
  }, [events, currentLocation]);

  // Calculate danger zones
  const getDangerZones = () => {
    const zones: { lat: number; lng: number; count: number }[] = [];
    const gridSize = 0.01; // ~1km grid

    events.forEach(event => {
      const gridLat = Math.round(event.location_lat / gridSize) * gridSize;
      const gridLng = Math.round(event.location_lng / gridSize) * gridSize;
      
      const existing = zones.find(z => 
        Math.abs(z.lat - gridLat) < 0.001 && Math.abs(z.lng - gridLng) < 0.001
      );
      
      if (existing) {
        existing.count++;
      } else {
        zones.push({ lat: gridLat, lng: gridLng, count: 1 });
      }
    });

    return zones.filter(z => z.count >= 2).sort((a, b) => b.count - a.count).slice(0, 5);
  };

  const dangerZones = getDangerZones();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Flame className="h-4 w-4 text-danger" />
            Accident Heatmap
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchEvents}
            disabled={isLoading}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Map */}
        <div 
          ref={mapContainerRef} 
          className="h-40 rounded-lg overflow-hidden border border-border"
        />

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-safe" />
            <span>Low</span>
          </div>
        </div>

        {/* Danger Zones */}
        {dangerZones.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              High-Risk Areas (30 days)
            </p>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {dangerZones.map((zone, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between bg-danger/10 p-1.5 rounded text-[10px] font-mono"
                >
                  <span className="text-muted-foreground">
                    {zone.lat.toFixed(3)}, {zone.lng.toFixed(3)}
                  </span>
                  <span className="text-danger font-bold">{zone.count} incidents</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex justify-between text-xs text-muted-foreground font-mono">
          <span>{events.length} events (30 days)</span>
          <span>{dangerZones.length} danger zones</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AccidentHeatmap;
