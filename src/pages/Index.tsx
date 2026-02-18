import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import EnhancedCollisionMap from '@/components/EnhancedCollisionMap';
import StatsCard from '@/components/StatsCard';
import AlertSystem from '@/components/AlertSystem';
import DemoDataButton from '@/components/DemoDataButton';
import RideController from '@/components/RideController';
import EmergencySOS from '@/components/EmergencySOS';
import NavigationRoute from '@/components/NavigationRoute';
import SpeedLimitAlert from '@/components/SpeedLimitAlert';
import RealtimePanel from '@/components/RealtimePanel';
import WeatherTrafficAlert from '@/components/WeatherTrafficAlert';
import AIChatAssistant from '@/components/AIChatAssistant';
import { useSpeedLimitAlert } from '@/hooks/useSpeedLimitAlert';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useRealtimeTracking } from '@/hooks/useRealtimeTracking';
import { useNativeGeolocation } from '@/hooks/useNativeGeolocation';
import { useNativeSpeech } from '@/hooks/useNativeSpeech';
import { Activity, AlertTriangle, Gauge, Shield } from 'lucide-react';

const Index = () => {
  const [stats, setStats] = useState({ activeVehicles: 0, totalCollisions: 0, averageSpeed: 0, safetyScore: 0 });
  const [isRideActive, setIsRideActive] = useState(false);
  const [detectedSpeed, setDetectedSpeed] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ lat: number; lng: number }[]>([]);
  const [dangerZones, setDangerZones] = useState<{ lat: number; lng: number; reason: string }[]>([]);
  const [destination, setDestination] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  const { location: nativeLocation, startTracking, stopTracking, getCurrentPosition, speed: nativeSpeed } = useNativeGeolocation({ enableHighAccuracy: true, enableBackgroundTracking: false });
  const { speak: nativeSpeak } = useNativeSpeech();
  const { cacheRoute } = useOfflineMode();

  const { currentSpeedLimit, roadType, isOverLimit, overLimitAmount } = useSpeedLimitAlert({
    currentSpeed: detectedSpeed, currentLocation, isActive: isRideActive,
    onSpeak: isMuted ? undefined : (msg) => nativeSpeak?.(msg),
  });

  const { nearbyVehicles, collisionWarnings, trafficUpdates, isConnected } = useRealtimeTracking({
    currentLocation, currentSpeed: detectedSpeed, isActive: isRideActive,
    onSpeak: isMuted ? undefined : (msg) => nativeSpeak?.(msg),
  });

  useEffect(() => { fetchStats(); const i = setInterval(fetchStats, 5000); return () => clearInterval(i); }, []);

  useEffect(() => {
    const init = async () => {
      const pos = await getCurrentPosition();
      setCurrentLocation(pos?.latitude ? { lat: pos.latitude, lng: pos.longitude } : { lat: 28.6139, lng: 77.2090 });
    };
    init();
  }, [getCurrentPosition]);

  useEffect(() => { isRideActive ? startTracking() : stopTracking(); }, [isRideActive, startTracking, stopTracking]);
  useEffect(() => { if (nativeLocation.latitude) setCurrentLocation({ lat: nativeLocation.latitude, lng: nativeLocation.longitude }); }, [nativeLocation.latitude, nativeLocation.longitude]);
  useEffect(() => { if (nativeSpeed && nativeSpeed > 0) { const s = nativeSpeed * 3.6; if (s > detectedSpeed) setDetectedSpeed(s); } }, [nativeSpeed, detectedSpeed]);

  const fetchStats = async () => {
    const { data: vehicles } = await supabase.from('vehicle_tracking').select('speed');
    const { data: collisions } = await supabase.from('collision_events').select('*').gte('timestamp', new Date(Date.now() - 86400000).toISOString());
    const av = vehicles?.length || 0;
    const tc = collisions?.length || 0;
    const as2 = vehicles?.length ? vehicles.reduce((s, v) => s + Number(v.speed), 0) / vehicles.length : 0;
    setStats({ activeVehicles: av, totalCollisions: tc, averageSpeed: as2, safetyScore: Math.max(0, 100 - tc * 5) });
  };

  const getSeverity = (s: number) => s >= 80 ? 'safe' as const : s >= 50 ? 'warning' as const : 'danger' as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <AlertSystem />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold font-mono gradient-text">Dashboard</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Real-time safety monitoring</p>
        </div>
        <DemoDataButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatsCard title="Vehicles" value={stats.activeVehicles} icon={Activity} severity="safe" />
        <StatsCard title="Collisions" value={stats.totalCollisions} icon={AlertTriangle} severity={stats.totalCollisions > 5 ? 'danger' : stats.totalCollisions > 0 ? 'warning' : 'safe'} />
        <StatsCard title="Avg Speed" value={`${stats.averageSpeed.toFixed(0)} km/h`} icon={Gauge} severity={stats.averageSpeed > 80 ? 'warning' : 'safe'} />
        <StatsCard title="Safety" value={`${stats.safetyScore.toFixed(0)}%`} icon={Shield} severity={getSeverity(stats.safetyScore)} />
      </div>

      {/* Main: Map + Ride Control */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Map */}
        <div className="lg:col-span-2 h-[300px] md:h-[400px] bg-card rounded-xl border border-border p-3">
          <EnhancedCollisionMap routeCoordinates={routeCoordinates} dangerZones={dangerZones} currentLocation={currentLocation} isRideActive={isRideActive} nearbyVehicleCount={nearbyVehicles.length} />
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <RideController onRideStateChange={setIsRideActive} detectedSpeed={detectedSpeed} />
          {isRideActive && <SpeedLimitAlert currentSpeed={detectedSpeed} speedLimit={currentSpeedLimit} isOverLimit={isOverLimit} overLimitAmount={overLimitAmount} roadType={roadType} />}
          <EmergencySOS currentLocation={currentLocation} isRideActive={isRideActive} />
        </div>
      </div>

      {/* Secondary: Navigation + Weather + Realtime */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NavigationRoute
          currentLocation={currentLocation}
          onRouteCalculated={(coords, zones) => { setRouteCoordinates(coords); setDangerZones(zones); if (currentLocation && destination) cacheRoute(currentLocation, destination, coords); }}
          destination={destination} setDestination={setDestination}
          speak={isMuted ? undefined : nativeSpeak}
        />
        <WeatherTrafficAlert currentLocation={currentLocation} />
        <RealtimePanel nearbyVehicles={nearbyVehicles} collisionWarnings={collisionWarnings} trafficUpdates={trafficUpdates} isConnected={isConnected} />
      </div>

      {/* AI Chat */}
      <AIChatAssistant currentSpeed={detectedSpeed} isRideActive={isRideActive} currentLocation={currentLocation} safetyScore={stats.safetyScore} collisionWarnings={collisionWarnings.length} />
    </div>
  );
};

export default Index;
