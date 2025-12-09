import { useEffect, useState } from 'react';
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
import { Activity, AlertTriangle, Gauge, Shield, Map, History, Route } from 'lucide-react';

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

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Get initial location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCurrentLocation({ lat: 28.6139, lng: 77.2090 }) // Default location
      );
    }
  }, []);

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
          <div className="flex gap-2">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <CameraDetection onSpeedDetected={setDetectedSpeed} isRideActive={isRideActive} />
            </div>
            <div className="space-y-4">
              <RideController onRideStateChange={setIsRideActive} detectedSpeed={detectedSpeed} />
              <EmergencySOS currentLocation={currentLocation} isRideActive={isRideActive} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
            <div className="lg:col-span-2 h-[400px] bg-card rounded-lg p-4 border border-border">
              <CollisionMap />
            </div>
            <div className="space-y-4">
              <SafeRouteAI currentLocation={currentLocation} />
              <WeatherTrafficAlert currentLocation={currentLocation} />
            </div>
            <div>
              <CollisionHistory />
            </div>
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
