import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import EnhancedCollisionMap from '@/components/EnhancedCollisionMap';
import StatsCard from '@/components/StatsCard';
import CollisionHistory from '@/components/CollisionHistory';
import AlertSystem from '@/components/AlertSystem';
import DemoDataButton from '@/components/DemoDataButton';
import AdvancedCameraDetection from '@/components/AdvancedCameraDetection';
import RideController from '@/components/RideController';
import WeatherTrafficAlert from '@/components/WeatherTrafficAlert';
import EmergencySOS from '@/components/EmergencySOS';
import NavigationRoute from '@/components/NavigationRoute';
import VoiceControlPanel from '@/components/VoiceControlPanel';
import SpeedLimitAlert from '@/components/SpeedLimitAlert';
import OfflineModeIndicator from '@/components/OfflineModeIndicator';
import RealtimePanel from '@/components/RealtimePanel';
import LiveDashboardHeader from '@/components/LiveDashboardHeader';
import UnifiedCollisionRisk from '@/components/UnifiedCollisionRisk';
import SafeRouteAI from '@/components/SafeRouteAI';
import AIChatAssistant from '@/components/AIChatAssistant';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useSpeedLimitAlert } from '@/hooks/useSpeedLimitAlert';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useRealtimeTracking } from '@/hooks/useRealtimeTracking';
import { useNativeGeolocation } from '@/hooks/useNativeGeolocation';
import { useNativeSpeech } from '@/hooks/useNativeSpeech';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { Activity, AlertTriangle, Gauge, Shield } from 'lucide-react';
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
  const [routeCoordinates, setRouteCoordinates] = useState<{ lat: number; lng: number }[]>([]);
  const [dangerZones, setDangerZones] = useState<{ lat: number; lng: number; reason: string }[]>([]);
  const [destination, setDestination] = useState('');
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const {
    location: nativeLocation,
    startTracking: startLocationTracking,
    stopTracking: stopLocationTracking,
    getCurrentPosition,
    speed: nativeSpeed,
  } = useNativeGeolocation({ enableHighAccuracy: true, enableBackgroundTracking: false });

  const { speak: nativeSpeak, speakCollisionWarning, speakSpeedWarning, speakSOSConfirmation, enableSpeech, isSupported: isSpeechSupported } = useNativeSpeech();

  const { sendLocalNotification } = usePushNotifications({
    onNotificationReceived: (n) => console.log('Notification:', n),
    autoRegister: true,
  });

  const { cacheCollisionEvent } = useOfflineStorage();
  const { isOffline, cachedRoutes, cacheSize, cacheRoute, clearCache } = useOfflineMode();

  const { currentSpeedLimit, roadType, isOverLimit, overLimitAmount } = useSpeedLimitAlert({
    currentSpeed: detectedSpeed,
    currentLocation,
    isActive: isRideActive,
    onSpeak: isMuted ? undefined : (msg) => nativeSpeak?.(msg),
  });

  const { nearbyVehicles, collisionWarnings, trafficUpdates, isConnected } = useRealtimeTracking({
    currentLocation,
    currentSpeed: detectedSpeed,
    isActive: isRideActive,
    onSpeak: isMuted ? undefined : (msg) => nativeSpeak?.(msg),
  });

  const handleVoiceCommand = useCallback((command: string, params?: any) => {
    switch (command) {
      case 'START_RIDE':
        if (!isRideActive) document.querySelector<HTMLButtonElement>('[data-ride-button="start"]')?.click();
        break;
      case 'STOP_RIDE':
        if (isRideActive) document.querySelector<HTMLButtonElement>('[data-ride-button="stop"]')?.click();
        break;
      case 'SOS':
        document.querySelector<HTMLButtonElement>('[data-sos-button]')?.click();
        break;
      case 'NAVIGATE':
        if (params?.destination) {
          setDestination(params.destination);
          setTimeout(() => document.querySelector<HTMLButtonElement>('[data-navigate-button]')?.click(), 100);
        }
        break;
      case 'CLEAR_ROUTE':
        setRouteCoordinates([]); setDangerZones([]); setDestination('');
        break;
      case 'GET_SPEED':
        nativeSpeak(`Your current speed is ${Math.max(detectedSpeed, 0).toFixed(0)} kilometers per hour`);
        break;
      case 'GET_LOCATION':
        if (currentLocation) nativeSpeak(`You are at latitude ${currentLocation.lat.toFixed(2)} and longitude ${currentLocation.lng.toFixed(2)}`);
        break;
      case 'SAFETY_CHECK':
        nativeSpeak(`Your safety score is ${stats.safetyScore.toFixed(0)} percent. ${stats.totalCollisions} collisions in the last 24 hours.`);
        break;
    }
  }, [isRideActive, detectedSpeed, currentLocation, stats, nativeSpeak]);

  const { speak, toggleListening, isSupported } = useVoiceCommands({
    onCommand: handleVoiceCommand,
    isListening: isVoiceListening,
    setIsListening: setIsVoiceListening,
  });

  useEffect(() => { fetchStats(); const i = setInterval(fetchStats, 5000); return () => clearInterval(i); }, []);

  useEffect(() => {
    const getInitialLocation = async () => {
      const pos = await getCurrentPosition();
      if (pos?.latitude && pos?.longitude) setCurrentLocation({ lat: pos.latitude, lng: pos.longitude });
      else setCurrentLocation({ lat: 28.6139, lng: 77.2090 });
    };
    getInitialLocation();
  }, [getCurrentPosition]);

  useEffect(() => {
    if (isRideActive) startLocationTracking(); else stopLocationTracking();
  }, [isRideActive, startLocationTracking, stopLocationTracking]);

  useEffect(() => {
    if (nativeLocation.latitude && nativeLocation.longitude) setCurrentLocation({ lat: nativeLocation.latitude, lng: nativeLocation.longitude });
  }, [nativeLocation.latitude, nativeLocation.longitude]);

  useEffect(() => {
    if (nativeSpeed !== null && nativeSpeed > 0) {
      const speedKmh = nativeSpeed * 3.6;
      if (speedKmh > detectedSpeed) setDetectedSpeed(speedKmh);
    }
  }, [nativeSpeed, detectedSpeed]);

  const fetchStats = async () => {
    const { data: vehicles } = await supabase.from('vehicle_tracking').select('speed');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: collisions } = await supabase.from('collision_events').select('*').gte('timestamp', oneDayAgo);
    const activeVehicles = vehicles?.length || 0;
    const totalCollisions = collisions?.length || 0;
    const averageSpeed = vehicles?.length ? vehicles.reduce((sum, v) => sum + Number(v.speed), 0) / vehicles.length : 0;
    const safetyScore = Math.max(0, 100 - (totalCollisions * 5));
    setStats({ activeVehicles, totalCollisions, averageSpeed, safetyScore });
  };

  const handleRouteCalculated = useCallback((coords: { lat: number; lng: number }[], zones: { lat: number; lng: number; reason: string }[]) => {
    setRouteCoordinates(coords); setDangerZones(zones);
  }, []);

  const getSafetyScoreSeverity = (score: number) => {
    if (score >= 80) return 'safe' as const;
    if (score >= 50) return 'warning' as const;
    return 'danger' as const;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <AlertSystem />

      {/* Page Header */}
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold font-mono gradient-text mb-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm md:text-base">Real-time collision prevention & monitoring</p>
        </div>
        <DemoDataButton />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <StatsCard title="Active Vehicles" value={stats.activeVehicles} icon={Activity} severity="safe" />
        <StatsCard title="24h Collisions" value={stats.totalCollisions} icon={AlertTriangle} severity={stats.totalCollisions > 5 ? 'danger' : stats.totalCollisions > 0 ? 'warning' : 'safe'} />
        <StatsCard title="Avg Speed" value={`${stats.averageSpeed.toFixed(1)} km/h`} icon={Gauge} severity={stats.averageSpeed > 80 ? 'warning' : 'safe'} />
        <StatsCard title="Safety Score" value={`${stats.safetyScore.toFixed(0)}%`} icon={Shield} severity={getSafetyScoreSeverity(stats.safetyScore)} />
      </div>

      {/* Live Dashboard Header */}
      <LiveDashboardHeader currentSpeed={detectedSpeed} safetyScore={stats.safetyScore} isRideActive={isRideActive} nearbyVehicles={nearbyVehicles.length} collisionWarnings={collisionWarnings.length} isConnected={isConnected} />

      {/* Offline indicator */}
      <div className="mb-4">
        <OfflineModeIndicator isOffline={isOffline} cachedRoutesCount={cachedRoutes.length} cacheSize={cacheSize} onClearCache={clearCache} />
      </div>

      {/* Camera & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2 order-2 lg:order-1">
          <AdvancedCameraDetection onSpeedDetected={setDetectedSpeed} isRideActive={isRideActive} onSpeak={isMuted ? undefined : nativeSpeak} />
        </div>
        <div className="space-y-4 order-1 lg:order-2">
          <RideController onRideStateChange={setIsRideActive} detectedSpeed={detectedSpeed} />
          {isRideActive && (
            <SpeedLimitAlert currentSpeed={detectedSpeed} speedLimit={currentSpeedLimit} isOverLimit={isOverLimit} overLimitAmount={overLimitAmount} roadType={roadType} />
          )}
          <VoiceControlPanel isListening={isVoiceListening} toggleListening={toggleListening} isSupported={isSupported} isMuted={isMuted} setIsMuted={setIsMuted} />
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="md:col-span-2 h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] bg-card rounded-lg p-3 md:p-4 border border-border">
          <EnhancedCollisionMap routeCoordinates={routeCoordinates} dangerZones={dangerZones} currentLocation={currentLocation} isRideActive={isRideActive} nearbyVehicleCount={nearbyVehicles.length} />
        </div>
        <div className="space-y-4">
          <UnifiedCollisionRisk currentSpeed={detectedSpeed} nearbyVehicles={nearbyVehicles.length} collisionWarnings={collisionWarnings} isRideActive={isRideActive} isOverSpeedLimit={isOverLimit} />
          <NavigationRoute currentLocation={currentLocation} onRouteCalculated={(coords, zones) => { handleRouteCalculated(coords, zones); if (currentLocation && destination) cacheRoute(currentLocation, destination, coords); }} destination={destination} setDestination={setDestination} speak={isMuted ? undefined : nativeSpeak} />
          <EmergencySOS currentLocation={currentLocation} isRideActive={isRideActive} />
        </div>
        <div className="space-y-4">
          <RealtimePanel nearbyVehicles={nearbyVehicles} collisionWarnings={collisionWarnings} trafficUpdates={trafficUpdates} isConnected={isConnected} />
          <WeatherTrafficAlert currentLocation={currentLocation} />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <SafeRouteAI currentLocation={currentLocation} />
        <CollisionHistory />
      </div>

      {/* AI Chat - Floating */}
      <AIChatAssistant currentSpeed={detectedSpeed} isRideActive={isRideActive} currentLocation={currentLocation} safetyScore={stats.safetyScore} collisionWarnings={collisionWarnings.length} />
    </div>
  );
};

export default Index;
