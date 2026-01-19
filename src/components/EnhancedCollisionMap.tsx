import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Locate, 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Navigation,
  AlertTriangle,
  Car
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  vehicle_id: string;
  current_lat: number;
  current_lng: number;
  speed: number;
  status: 'active' | 'warning' | 'danger' | 'stopped';
}

interface EnhancedCollisionMapProps {
  routeCoordinates?: { lat: number; lng: number }[];
  dangerZones?: { lat: number; lng: number; reason: string }[];
  currentLocation?: { lat: number; lng: number } | null;
  isRideActive?: boolean;
  collisionRisk?: number;
  nearbyVehicleCount?: number;
}

type MapStyle = 'default' | 'satellite' | 'dark';

const MAP_TILES: Record<MapStyle, { url: string; attribution: string }> = {
  default: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO',
  },
};

const EnhancedCollisionMap = ({ 
  routeCoordinates = [], 
  dangerZones = [], 
  currentLocation,
  isRideActive = false,
  collisionRisk = 0,
  nearbyVehicleCount = 0,
}: EnhancedCollisionMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);
  const dangerMarkersRef = useRef<L.Marker[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark');
  const [showLegend, setShowLegend] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([28.6139, 77.2090], 13);

    // Add tile layer
    tileLayerRef.current = L.tileLayer(MAP_TILES[mapStyle].url, {
      attribution: MAP_TILES[mapStyle].attribution,
      maxZoom: 19,
    }).addTo(map);

    // Add attribution in corner
    L.control.attribution({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;
    fetchVehicles();

    // Realtime subscription
    const channel = supabase
      .channel('vehicle-tracking-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_tracking' }, () => fetchVehicles())
      .subscribe();

    // Handle resize
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('resize', handleResize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer when style changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    
    tileLayerRef.current.remove();
    tileLayerRef.current = L.tileLayer(MAP_TILES[mapStyle].url, {
      attribution: MAP_TILES[mapStyle].attribution,
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [mapStyle]);

  const fetchVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicle_tracking')
      .select('*')
      .order('last_update', { ascending: false });

    if (!error && data) {
      setVehicles(data as Vehicle[]);
    }
  };

  // Update user location marker with animation
  useEffect(() => {
    if (!mapRef.current || !currentLocation) return;

    const position: L.LatLngExpression = [currentLocation.lat, currentLocation.lng];

    if (userMarkerRef.current) {
      // Smooth animation to new position
      userMarkerRef.current.setLatLng(position);
    } else {
      // Create user marker with pulse effect
      const userIcon = L.divIcon({
        className: 'user-marker-container',
        html: `
          <div class="relative">
            <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75" style="width: 32px; height: 32px;"></div>
            <div class="relative bg-blue-500 rounded-full border-4 border-white shadow-lg" style="width: 24px; height: 24px; margin: 4px;"></div>
            ${isRideActive ? `
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            ` : ''}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      
      userMarkerRef.current = L.marker(position, { 
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(mapRef.current);
      
      userMarkerRef.current.bindPopup(`
        <div class="text-sm font-mono">
          <strong>Your Location</strong><br/>
          <span class="text-xs text-gray-500">
            ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}
          </span>
        </div>
      `);
    }

    // Add/update accuracy circle
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(position);
    } else {
      accuracyCircleRef.current = L.circle(position, {
        radius: 50,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(mapRef.current);
    }

    // Follow user if enabled
    if (isFollowing) {
      mapRef.current.setView(position, mapRef.current.getZoom(), {
        animate: true,
        duration: 0.5,
      });
    }
  }, [currentLocation, isFollowing, isRideActive]);

  // Update route line with gradient effect
  useEffect(() => {
    if (!mapRef.current) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (routeCoordinates.length > 0) {
      const latLngs = routeCoordinates.map(c => [c.lat, c.lng] as L.LatLngExpression);
      
      // Create route with glow effect
      routeLineRef.current = L.polyline(latLngs, {
        color: '#10b981',
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(mapRef.current);

      // Add shadow/glow
      L.polyline(latLngs, {
        color: '#10b981',
        weight: 12,
        opacity: 0.3,
      }).addTo(mapRef.current);

      // Fit bounds with padding
      const bounds = L.latLngBounds(latLngs);
      mapRef.current.fitBounds(bounds, { 
        padding: [50, 50],
        animate: true,
      });
    }
  }, [routeCoordinates]);

  // Update danger zone markers
  useEffect(() => {
    if (!mapRef.current) return;

    dangerMarkersRef.current.forEach(marker => marker.remove());
    dangerMarkersRef.current = [];

    dangerZones.forEach(zone => {
      const dangerIcon = L.divIcon({
        className: 'danger-zone-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-10 h-10 bg-red-500 rounded-full animate-ping opacity-50"></div>
            <div class="relative w-6 h-6 bg-red-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
              <span class="text-white text-xs font-bold">!</span>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      
      const marker = L.marker([zone.lat, zone.lng], { icon: dangerIcon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div class="text-sm">
            <div class="flex items-center gap-2 text-red-500 font-bold mb-1">
              ⚠️ Danger Zone
            </div>
            <p class="text-gray-600">${zone.reason}</p>
          </div>
        `);
      
      // Add danger radius
      L.circle([zone.lat, zone.lng], {
        radius: 100,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(mapRef.current!);
      
      dangerMarkersRef.current.push(marker);
    });
  }, [dangerZones]);

  // Update vehicle markers
  useEffect(() => {
    if (!mapRef.current) return;

    vehicles.forEach((vehicle) => {
      const position: L.LatLngExpression = [vehicle.current_lat, vehicle.current_lng];
      let marker = markersRef.current.get(vehicle.vehicle_id);
      
      const statusColors = {
        active: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        stopped: '#6b7280',
      };
      
      const color = statusColors[vehicle.status];

      if (!marker) {
        const icon = L.divIcon({
          className: 'vehicle-marker',
          html: `
            <div class="flex items-center justify-center">
              <div class="w-5 h-5 rounded-full border-2 border-white shadow-lg" 
                   style="background: ${color}; box-shadow: 0 0 10px ${color};">
              </div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        marker = L.marker(position, { icon }).addTo(mapRef.current!);
        marker.bindPopup(`
          <div class="text-sm font-mono">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-3 h-3 rounded-full" style="background: ${color}"></div>
              <strong>Vehicle ${vehicle.vehicle_id}</strong>
            </div>
            <div class="space-y-1 text-xs">
              <div>Speed: ${vehicle.speed.toFixed(1)} km/h</div>
              <div>Status: <span class="capitalize">${vehicle.status}</span></div>
            </div>
          </div>
        `);
        markersRef.current.set(vehicle.vehicle_id, marker);
      } else {
        marker.setLatLng(position);
      }
    });

    // Remove old markers
    markersRef.current.forEach((marker, vehicleId) => {
      if (!vehicles.find(v => v.vehicle_id === vehicleId)) {
        marker.remove();
        markersRef.current.delete(vehicleId);
      }
    });
  }, [vehicles]);

  // Map controls
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleCenterOnUser = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.setView([currentLocation.lat, currentLocation.lng], 16, { animate: true });
      setIsFollowing(true);
    }
  };

  const cycleMapStyle = () => {
    const styles: MapStyle[] = ['default', 'dark', 'satellite'];
    const currentIndex = styles.indexOf(mapStyle);
    setMapStyle(styles[(currentIndex + 1) % styles.length]);
  };

  return (
    <div className={cn(
      "relative h-full w-full rounded-lg overflow-hidden border border-border bg-black",
      isFullscreen && "fixed inset-0 z-50 rounded-none"
    )}>
      <div ref={mapContainerRef} className="h-full w-full" />
      
      {/* Status overlay */}
      {isRideActive && (
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-[1000]">
          <div className={cn(
            "px-3 py-2 rounded-lg backdrop-blur-sm border font-mono text-xs sm:text-sm",
            collisionRisk >= 70 ? "bg-danger/90 border-danger text-white" :
            collisionRisk >= 40 ? "bg-warning/90 border-warning text-black" :
            "bg-safe/90 border-safe text-white"
          )}>
            <div className="flex items-center gap-2">
              {collisionRisk >= 40 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              <span>Risk: {collisionRisk.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Nearby vehicles badge */}
      {nearbyVehicleCount > 0 && (
        <div className="absolute top-2 right-12 sm:top-4 sm:right-16 z-[1000]">
          <Badge variant="secondary" className="font-mono flex items-center gap-1">
            <Car className="h-3 w-3" />
            {nearbyVehicleCount}
          </Badge>
        </div>
      )}

      {/* Map controls */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-[1000] flex flex-col gap-1 sm:gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 bg-card/90 backdrop-blur-sm"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 bg-card/90 backdrop-blur-sm"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className={cn(
            "h-8 w-8 sm:h-9 sm:w-9 bg-card/90 backdrop-blur-sm",
            isFollowing && "ring-2 ring-primary"
          )}
          onClick={handleCenterOnUser}
        >
          <Locate className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 bg-card/90 backdrop-blur-sm"
          onClick={cycleMapStyle}
        >
          <Layers className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 bg-card/90 backdrop-blur-sm hidden sm:flex"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-[1000] bg-card/95 backdrop-blur-sm p-2 sm:p-3 rounded-lg border border-border">
          <div className="text-[10px] sm:text-xs font-mono space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
              <span>Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-safe" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-danger" />
              <span>Danger</span>
            </div>
            {routeCoordinates.length > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
                <div className="w-4 h-0.5 bg-safe rounded" />
                <span>Route</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Map style indicator */}
      <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-[1000]">
        <Badge variant="secondary" className="text-[10px] capitalize">
          {mapStyle}
        </Badge>
      </div>
    </div>
  );
};

export default EnhancedCollisionMap;
