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

interface CollisionMapProps {
  routeCoordinates?: { lat: number; lng: number }[];
  dangerZones?: { lat: number; lng: number; reason: string }[];
  currentLocation?: { lat: number; lng: number } | null;
}

const CollisionMap = ({ routeCoordinates = [], dangerZones = [], currentLocation }: CollisionMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);
  const dangerMarkersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    fetchVehicles();

    const channel = supabase
      .channel('vehicle-tracking-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_tracking' }, () => fetchVehicles())
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

    if (!error && data) {
      setVehicles(data as Vehicle[]);
    }
  };

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !currentLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div style="background: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);"></div>`,
        iconSize: [24, 24],
      });
      userMarkerRef.current = L.marker([currentLocation.lat, currentLocation.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup('Your Location');
    }

    mapRef.current.setView([currentLocation.lat, currentLocation.lng], 15);
  }, [currentLocation]);

  // Update route line
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old route
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // Add new route
    if (routeCoordinates.length > 0) {
      const latLngs = routeCoordinates.map(c => [c.lat, c.lng] as L.LatLngExpression);
      routeLineRef.current = L.polyline(latLngs, {
        color: '#10b981',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(mapRef.current);

      // Fit bounds to route
      const bounds = L.latLngBounds(latLngs);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routeCoordinates]);

  // Update danger zone markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old danger markers
    dangerMarkersRef.current.forEach(marker => marker.remove());
    dangerMarkersRef.current = [];

    // Add new danger markers
    dangerZones.forEach(zone => {
      const dangerIcon = L.divIcon({
        className: 'danger-marker',
        html: `<div style="background: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(239, 68, 68, 0.6); animation: pulse 2s infinite;"></div>`,
        iconSize: [20, 20],
      });
      const marker = L.marker([zone.lat, zone.lng], { icon: dangerIcon })
        .addTo(mapRef.current!)
        .bindPopup(`⚠️ ${zone.reason}`);
      dangerMarkersRef.current.push(marker);
    });
  }, [dangerZones]);

  // Update vehicle markers
  useEffect(() => {
    if (!mapRef.current) return;

    vehicles.forEach((vehicle) => {
      const position: L.LatLngExpression = [vehicle.current_lat, vehicle.current_lng];
      let marker = markersRef.current.get(vehicle.vehicle_id);
      
      if (!marker) {
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
        marker.setLatLng(position);
      }
    });

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
        <div className="text-xs font-mono space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-safe" />
            <span>Active Vehicles</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger" />
            <span>Danger Zone</span>
          </div>
          {routeCoordinates.length > 0 && (
            <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
              <div className="w-6 h-0.5 bg-safe" style={{ borderStyle: 'dashed' }} />
              <span>Navigation Route</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollisionMap;
