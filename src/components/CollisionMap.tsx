import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';

interface Vehicle {
  id: string;
  vehicle_id: string;
  current_lat: number;
  current_lng: number;
  speed: number;
  status: 'active' | 'warning' | 'danger' | 'stopped';
}

const CollisionMap = () => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map centered on a default location
    mapRef.current = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 13);

    // Add OpenStreetMap tiles (no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Fetch initial vehicle data
    fetchVehicles();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('vehicle-tracking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vehicle_tracking'
        },
        () => {
          fetchVehicles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicle_tracking')
      .select('*')
      .order('last_update', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return;
    }

    setVehicles((data || []) as Vehicle[]);
  };

  useEffect(() => {
    if (!mapRef.current) return;

    // Update markers
    vehicles.forEach((vehicle) => {
      const position: L.LatLngExpression = [vehicle.current_lat, vehicle.current_lng];
      
      // Get or create marker
      let marker = markersRef.current.get(vehicle.vehicle_id);
      
      if (!marker) {
        // Create custom icon based on status
        const iconColor = {
          active: '#10b981',
          warning: '#f59e0b',
          danger: '#ef4444',
          stopped: '#6b7280'
        }[vehicle.status];

        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background: ${iconColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${iconColor};"></div>`,
          iconSize: [20, 20],
        });

        marker = L.marker(position, { icon }).addTo(mapRef.current!);
        marker.bindPopup(`
          <div class="text-sm">
            <strong>Vehicle ${vehicle.vehicle_id}</strong><br/>
            Speed: ${vehicle.speed.toFixed(1)} km/h<br/>
            Status: ${vehicle.status}
          </div>
        `);
        markersRef.current.set(vehicle.vehicle_id, marker);
      } else {
        // Update existing marker position
        marker.setLatLng(position);
      }
    });

    // Remove markers for vehicles no longer in the list
    markersRef.current.forEach((marker, vehicleId) => {
      if (!vehicles.find(v => v.vehicle_id === vehicleId)) {
        marker.remove();
        markersRef.current.delete(vehicleId);
      }
    });
  }, [vehicles]);

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden border border-border">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg border border-border">
        <div className="text-xs font-mono">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-safe" style={{ boxShadow: 'var(--glow-safe)' }} />
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-warning" style={{ boxShadow: 'var(--glow-warning)' }} />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger" style={{ boxShadow: 'var(--glow-danger)' }} />
            <span>Danger</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollisionMap;
