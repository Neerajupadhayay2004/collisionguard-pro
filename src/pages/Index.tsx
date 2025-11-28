import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CollisionMap from '@/components/CollisionMap';
import StatsCard from '@/components/StatsCard';
import CollisionHistory from '@/components/CollisionHistory';
import AlertSystem from '@/components/AlertSystem';
import DemoDataButton from '@/components/DemoDataButton';
import CameraDetection from '@/components/CameraDetection';
import RideController from '@/components/RideController';
import { Activity, AlertTriangle, Gauge, Shield } from 'lucide-react';

const Index = () => {
  const [stats, setStats] = useState({
    activeVehicles: 0,
    totalCollisions: 0,
    averageSpeed: 0,
    safetyScore: 0,
  });
  const [isRideActive, setIsRideActive] = useState(false);
  const [detectedSpeed, setDetectedSpeed] = useState(0);

  useEffect(() => {
    fetchStats();

    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    // Fetch active vehicles
    const { data: vehicles } = await supabase
      .from('vehicle_tracking')
      .select('speed');

    // Fetch collision events from last 24 hours
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

    // Simple safety score calculation
    const safetyScore = Math.max(0, 100 - (totalCollisions * 5));

    setStats({
      activeVehicles,
      totalCollisions,
      averageSpeed,
      safetyScore,
    });
  };

  const getSafetyScoreSeverity = (score: number) => {
    if (score >= 80) return 'safe';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <AlertSystem />
      
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold font-mono mb-2 bg-gradient-to-r from-safe to-primary bg-clip-text text-transparent">
              Collision Prevention Dashboard
            </h1>
            <p className="text-muted-foreground font-mono">Real-time monitoring & AI-powered alerts</p>
          </div>
          <DemoDataButton />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Active Vehicles"
          value={stats.activeVehicles}
          icon={Activity}
          severity="safe"
        />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <CameraDetection 
            onSpeedDetected={setDetectedSpeed}
            isRideActive={isRideActive}
          />
        </div>
        <div className="lg:col-span-1">
          <RideController 
            onRideStateChange={setIsRideActive}
            detectedSpeed={detectedSpeed}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="h-[500px] bg-card rounded-lg p-4 border border-border">
            <CollisionMap />
          </div>
        </div>
        <div className="lg:col-span-1">
          <CollisionHistory />
        </div>
      </div>
    </div>
  );
};

export default Index;
