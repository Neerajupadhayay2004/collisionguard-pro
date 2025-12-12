import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
import DriverFatigueDetector from '@/components/DriverFatigueDetector';
import NightModeController from '@/components/NightModeController';
import AccidentHeatmap from '@/components/AccidentHeatmap';
import EmergencyContactsManager from '@/components/EmergencyContactsManager';
import MotionSensorDisplay from '@/components/MotionSensorDisplay';
import NotificationManager from '@/components/NotificationManager';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';
import { useSpeedLimitAlert } from '@/hooks/useSpeedLimitAlert';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useRealtimeTracking } from '@/hooks/useRealtimeTracking';
import { useNativeGeolocation } from '@/hooks/useNativeGeolocation';
import { useNativeSpeech } from '@/hooks/useNativeSpeech';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { Activity, AlertTriangle, Gauge, Shield, Map, History, Settings, Menu, X, MapPin, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Native geolocation hook
  const {
    location: nativeLocation,
    isTracking: isLocationTracking,
    startTracking: startLocationTracking,
    stopTracking: stopLocationTracking,
    getCurrentPosition,
    isNative: isNativePlatform,
    speed: nativeSpeed,
  } = useNativeGeolocation({
    enableHighAccuracy: true,
    enableBackgroundTracking: false,
  });

  // Native speech hook
  const { 
    speak: nativeSpeak, 
    speakCollisionWarning,
    speakSpeedWarning,
    speakSOSConfirmation,
    isSupported: isSpeechSupported,
  } = useNativeSpeech();

  // Push notifications hook
  const {
    hasPermission: hasNotificationPermission,
    sendLocalNotification,
    register: registerPushNotifications,
  } = usePushNotifications({
    onNotificationReceived: (notification) => {
      console.log('Notification received:', notification);
    },
    autoRegister: true,
  });

  // Offline storage hook
  const {
    saveSettings,
    getSettings,
    cacheCollisionEvent,
    getPendingCollisionEvents,
    cacheEmergencyContacts,
  } = useOfflineStorage();

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
    onSpeak: isMuted ? undefined : (msg) => nativeSpeak?.(msg),
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
    onSpeak: isMuted ? undefined : (msg) => nativeSpeak?.(msg),
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
        nativeSpeak(`Your current speed is ${Math.max(detectedSpeed, 0).toFixed(0)} kilometers per hour`);
        break;
      case 'GET_LOCATION':
        if (currentLocation) {
          nativeSpeak(`You are at latitude ${currentLocation.lat.toFixed(2)} and longitude ${currentLocation.lng.toFixed(2)}`);
        }
        break;
      case 'SAFETY_CHECK':
        nativeSpeak(`Your safety score is ${stats.safetyScore.toFixed(0)} percent. ${stats.totalCollisions} collisions in the last 24 hours.`);
        break;
    }
  }, [isRideActive, detectedSpeed, currentLocation, stats, nativeSpeak]);

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

  // Get initial location using native geolocation
  useEffect(() => {
    const getInitialLocation = async () => {
      const pos = await getCurrentPosition();
      if (pos?.latitude && pos?.longitude) {
        setCurrentLocation({ lat: pos.latitude, lng: pos.longitude });
      } else {
        // Fallback to default location
        setCurrentLocation({ lat: 28.6139, lng: 77.2090 });
      }
    };
    getInitialLocation();
  }, [getCurrentPosition]);

  // Start/stop location tracking with ride
  useEffect(() => {
    if (isRideActive) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isRideActive, startLocationTracking, stopLocationTracking]);

  // Update currentLocation from native geolocation when tracking
  useEffect(() => {
    if (nativeLocation.latitude && nativeLocation.longitude) {
      setCurrentLocation({ 
        lat: nativeLocation.latitude, 
        lng: nativeLocation.longitude 
      });
    }
  }, [nativeLocation.latitude, nativeLocation.longitude]);

  // Use native speed if available
  useEffect(() => {
    if (nativeSpeed !== null && nativeSpeed > 0) {
      // Convert m/s to km/h
      const speedKmh = nativeSpeed * 3.6;
      if (speedKmh > detectedSpeed) {
        setDetectedSpeed(speedKmh);
      }
    }
  }, [nativeSpeed, detectedSpeed]);

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
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-4 md:p-6 safe-area-top safe-area-bottom">
      <AlertSystem />
      
      {/* Header - Mobile Optimized */}
      <header className="mb-4 md:mb-6">
        <div className="flex justify-between items-center gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl md:text-4xl font-bold font-mono mb-1 gradient-text truncate">
              Collision Prevention
            </h1>
            <p className="text-muted-foreground font-mono text-[10px] sm:text-xs md:text-sm hidden sm:block">
              Real-time monitoring & AI-powered alerts
            </p>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-muted text-muted-foreground touch-target"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={cn(
                "px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-colors",
                activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
              )}
            >
              <Map className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-colors",
                activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-secondary'
              )}
            >
              <History className="h-4 w-4" />
              History
            </button>
            <DemoDataButton />
            <Link
              to="/settings"
              className="px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 bg-muted text-muted-foreground hover:bg-secondary transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 p-3 bg-card rounded-lg border border-border animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={cn(
                  "px-3 py-3 rounded-lg font-mono text-sm flex items-center justify-center gap-2 touch-target",
                  activeTab === 'dashboard' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                <Map className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
                className={cn(
                  "px-3 py-3 rounded-lg font-mono text-sm flex items-center justify-center gap-2 touch-target",
                  activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                <History className="h-4 w-4" />
                History
              </button>
              <Link
                to="/settings"
                className="px-3 py-3 rounded-lg font-mono text-sm flex items-center justify-center gap-2 bg-muted text-muted-foreground touch-target"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <DemoDataButton />
            </div>
          </div>
        )}
      </header>

      {/* Stats Grid - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 md:mb-6">
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
          <div className="mb-3 md:mb-4">
            <OfflineModeIndicator
              isOffline={isOffline}
              cachedRoutesCount={cachedRoutes.length}
              cacheSize={cacheSize}
              onClearCache={clearCache}
            />
          </div>

          {/* Camera & Controls - Mobile Stacked */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mb-4 md:mb-6">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <CameraDetection onSpeedDetected={setDetectedSpeed} isRideActive={isRideActive} />
            </div>
            <div className="space-y-3 md:space-y-4 order-1 lg:order-2">
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

          {/* Main Dashboard Grid - Mobile Optimized */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-4 md:mb-6">
            {/* Map - Full width on mobile */}
            <div className="md:col-span-2 h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] bg-card rounded-lg p-2 sm:p-3 md:p-4 border border-border">
              <CollisionMap 
                routeCoordinates={routeCoordinates}
                dangerZones={dangerZones}
                currentLocation={currentLocation}
              />
            </div>
            
            {/* Navigation & Emergency */}
            <div className="space-y-3 md:space-y-4">
              <NavigationRoute 
                currentLocation={currentLocation}
                onRouteCalculated={(coords, zones) => {
                  handleRouteCalculated(coords, zones);
                  if (currentLocation && destination) {
                    cacheRoute(currentLocation, destination, coords);
                  }
                }}
                destination={destination}
                setDestination={setDestination}
                speak={isMuted ? undefined : nativeSpeak}
              />
              <EmergencySOS currentLocation={currentLocation} isRideActive={isRideActive} />
            </div>
            
            {/* Realtime & Weather */}
            <div className="space-y-3 md:space-y-4">
              <RealtimePanel
                nearbyVehicles={nearbyVehicles}
                collisionWarnings={collisionWarnings}
                trafficUpdates={trafficUpdates}
                isConnected={isConnected}
              />
              <WeatherTrafficAlert currentLocation={currentLocation} />
            </div>
          </div>

          {/* New Features Grid - Mobile 1 col, Tablet 2 col, Desktop 5 col */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6 mb-4 md:mb-6">
            <MotionSensorDisplay 
              isRideActive={isRideActive}
              onCollisionDetected={async (result) => {
                // Cache collision for offline sync
                await cacheCollisionEvent({
                  id: `motion-${Date.now()}`,
                  severity: result.severity,
                  location: currentLocation || { lat: 0, lng: 0 },
                  timestamp: result.timestamp,
                  synced: false,
                });
                // Send push notification
                await sendLocalNotification(
                  'Impact Detected!',
                  `${result.severity.toUpperCase()} impact (${result.impactForce.toFixed(1)}G) from ${result.direction}`
                );
              }}
              onSpeak={isMuted ? undefined : nativeSpeak}
            />
            <DriverFatigueDetector 
              isRideActive={isRideActive} 
              onSpeak={isMuted ? undefined : nativeSpeak}
            />
            <NightModeController isRideActive={isRideActive} />
            <AccidentHeatmap currentLocation={currentLocation} />
            <NotificationManager isRideActive={isRideActive} />
            <EmergencyContactsManager />
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
            <SafeRouteAI currentLocation={currentLocation} />
            <CollisionHistory />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 lg:gap-6">
          <TripHistory />
          <CollisionHistory />
        </div>
      )}
    </div>
  );
};

export default Index;
