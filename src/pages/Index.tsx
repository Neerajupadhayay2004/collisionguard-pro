import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CollisionMap from '@/components/CollisionMap';
import StatsCard from '@/components/StatsCard';
import CollisionHistory from '@/components/CollisionHistory';
import AlertSystem from '@/components/AlertSystem';
import DemoDataButton from '@/components/DemoDataButton';
import CameraDetection from '@/components/CameraDetection';
import RideController from '@/components/RideController';
import SafeRouteAI from '@/components/SafeRouteAI';
import WeatherTrafficAlert from '@/components/WeatherTrafficAlert';
import EmergencySOS from '@/components/EmergencySOS';
import TripHistory from '@/components/TripHistory';
import NavigationRoute from '@/components/NavigationRoute';
import VoiceControlPanel from '@/components/VoiceControlPanel';
import SpeedLimitAlert from '@/components/SpeedLimitAlert';
import OfflineModeIndicator from '@/components/OfflineModeIndicator';
import RealtimePanel from '@/components/RealtimePanel';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useSpeedLimitAlert } from '@/hooks/useSpeedLimitAlert';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useRealtimeTracking } from '@/hooks/useRealtimeTracking';
import { Activity, AlertTriangle, Gauge, Shield, Map, History } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [stats, setStats] = useState({
    activeVehicles: 0,
    totalCollisions: 0,
    averageSpeed: 0,
    safetyScore: 0,
  });
  const [isRideActive, setIsRideActive] = useState(false);
  const [detectedSpeed, setDetectedSpeed] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [routeCoordinates, setRouteCoordinates] = useState<{ lat: number; lng: number }[]>([]);
  const [dangerZones, setDangerZones] = useState<{ lat: number; lng: number; reason: string }[]>([]);
  const [destination, setDestination] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Offline mode hook
  const {
    isOffline,
    cachedRoutes,
    cacheSize,
    cacheRoute,
    clearCache,
  } = useOfflineMode();

  // Speed limit alert hook
  const {
    currentSpeedLimit,
    roadType,
    isOverLimit,
    overLimitAmount,
  } = useSpeedLimitAlert({
    currentSpeed: detectedSpeed,
    currentLocation,
    isActive: isRideActive,
    onSpeak: isMuted ? undefined : (msg) => speak?.(msg),
  });

  // Realtime tracking hook
  const {
    nearbyVehicles,
    collisionWarnings,
    trafficUpdates,
    isConnected,
  } = useRealtimeTracking({
    currentLocation,
    currentSpeed: detectedSpeed,
    isActive: isRideActive,
    onSpeak: isMuted ? undefined : (msg) => speak?.(msg),
  });

  // Voice command handler
  const handleVoiceCommand = useCallback((command: string, params?: any) => {
    console.log('Voice command received:', command, params);
    
    switch (command) {
      case 'START_RIDE':
        if (!isRideActive) {
          // Trigger start ride - this will be handled by RideController
          document.querySelector<HTMLButtonElement>('[data-ride-button="start"]')?.click();
        }
        break;
      case 'STOP_RIDE':
        if (isRideActive) {
          document.querySelector<HTMLButtonElement>('[data-ride-button="stop"]')?.click();
        }
        break;
      case 'SOS':
        document.querySelector<HTMLButtonElement>('[data-sos-button]')?.click();
        break;
      case 'NAVIGATE':
        if (params?.destination) {
          setDestination(params.destination);
          setTimeout(() => {
            document.querySelector<HTMLButtonElement>('[data-navigate-button]')?.click();
          }, 100);
        }
        break;
      case 'CLEAR_ROUTE':
        setRouteCoordinates([]);
        setDangerZones([]);
        setDestination('');
        break;
      case 'GET_SPEED':
        if (speak) {
          speak(`Your current speed is ${Math.max(detectedSpeed, 0).toFixed(0)} kilometers per hour`);
        }
        break;
      case 'GET_LOCATION':
        if (speak && currentLocation) {
          speak(`You are at latitude ${currentLocation.lat.toFixed(2)} and longitude ${currentLocation.lng.toFixed(2)}`);
        }
        break;
      case 'SAFETY_CHECK':
        if (speak) {
          speak(`Your safety score is ${stats.safetyScore.toFixed(0)} percent. ${stats.totalCollisions} collisions in the last 24 hours.`);
        }
        break;
    }
  }, [isRideActive, detectedSpeed, currentLocation, stats]);

  const { speak, toggleListening, isSupported } = useVoiceCommands({
    onCommand: handleVoiceCommand,
    isListening: isVoiceListening,
    setIsListening: setIsVoiceListening
  });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCurrentLocation({ lat: 28.6139, lng: 77.2090 })
      );
    }
  }, []);

  // Update location when ride is active
  useEffect(() => {
    if (!isRideActive) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isRideActive]);

  const fetchStats = async () => {
    const { data: vehicles } = await supabase.from('vehicle_tracking').select('speed');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: collisions } = await supabase
      .from('collision_events')
      .select('*')
      .gte('timestamp', oneDayAgo);

    const activeVehicles = vehicles?.length || 0;
    const totalCollisions = collisions?.length || 0;
    const averageSpeed = vehicles?.length 
      ? vehicles.reduce((sum, v) => sum + Number(v.speed), 0) / vehicles.length 
      : 0;
    const safetyScore = Math.max(0, 100 - (totalCollisions * 5));

    setStats({ activeVehicles, totalCollisions, averageSpeed, safetyScore });
  };

  const handleRouteCalculated = useCallback((coords: { lat: number; lng: number }[], zones: { lat: number; lng: number; reason: string }[]) => {
    setRouteCoordinates(coords);
    setDangerZones(zones);
  }, []);

  const getSafetyScoreSeverity = (score: number) => {
    if (score >= 80) return 'safe';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <AlertSystem />
      
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold font-mono mb-2 bg-gradient-to-r from-safe to-primary bg-clip-text text-transparent">
              Collision Prevention Dashboard
            </h1>
            <p className="text-muted-foreground font-mono text-sm">Real-time monitoring & AI-powered alerts</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 ${
                activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 ${
                activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </button>
            <DemoDataButton />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
        <StatsCard title="Active Vehicles" value={stats.activeVehicles} icon={Activity} severity="safe" />
        <StatsCard
          title="24h Collisions"
          value={stats.totalCollisions}
          icon={AlertTriangle}
          severity={stats.totalCollisions > 5 ? 'danger' : stats.totalCollisions > 0 ? 'warning' : 'safe'}
        />
        <StatsCard
          title="Avg Speed"
          value={`${stats.averageSpeed.toFixed(1)} km/h`}
          icon={Gauge}
          severity={stats.averageSpeed > 80 ? 'warning' : 'safe'}
        />
        <StatsCard
          title="Safety Score"
          value={`${stats.safetyScore.toFixed(0)}%`}
          icon={Shield}
          severity={getSafetyScoreSeverity(stats.safetyScore)}
        />
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* Offline indicator */}
          <div className="mb-4">
            <OfflineModeIndicator
              isOffline={isOffline}
              cachedRoutesCount={cachedRoutes.length}
              cacheSize={cacheSize}
              onClearCache={clearCache}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <CameraDetection onSpeedDetected={setDetectedSpeed} isRideActive={isRideActive} />
            </div>
            <div className="space-y-4">
              <RideController onRideStateChange={setIsRideActive} detectedSpeed={detectedSpeed} />
              
              {/* Speed Limit Alert */}
              {isRideActive && (
                <SpeedLimitAlert
                  currentSpeed={detectedSpeed}
                  speedLimit={currentSpeedLimit}
                  isOverLimit={isOverLimit}
                  overLimitAmount={overLimitAmount}
                  roadType={roadType}
                />
              )}
              
              <VoiceControlPanel
                isListening={isVoiceListening}
                toggleListening={toggleListening}
                isSupported={isSupported}
                isMuted={isMuted}
                setIsMuted={setIsMuted}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-2 h-[450px] bg-card rounded-lg p-4 border border-border">
              <CollisionMap 
                routeCoordinates={routeCoordinates}
                dangerZones={dangerZones}
                currentLocation={currentLocation}
              />
            </div>
            <div className="space-y-4">
              <NavigationRoute 
                currentLocation={currentLocation}
                onRouteCalculated={(coords, zones) => {
                  handleRouteCalculated(coords, zones);
                  // Cache route for offline use
                  if (currentLocation && destination) {
                    cacheRoute(currentLocation, destination, coords);
                  }
                }}
                destination={destination}
                setDestination={setDestination}
                speak={isMuted ? undefined : speak}
              />
              <EmergencySOS currentLocation={currentLocation} isRideActive={isRideActive} />
            </div>
            <div className="space-y-4">
              {/* Realtime Panel */}
              <RealtimePanel
                nearbyVehicles={nearbyVehicles}
                collisionWarnings={collisionWarnings}
                trafficUpdates={trafficUpdates}
                isConnected={isConnected}
              />
              <WeatherTrafficAlert currentLocation={currentLocation} />
              <SafeRouteAI currentLocation={currentLocation} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CollisionHistory />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TripHistory />
          <CollisionHistory />
        </div>
      )}
    </div>
  );
};

export default Index;
