import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHaptics } from './useHaptics';

interface TrackedVehicle {
  id: string;
  vehicle_id: string;
  current_lat: number;
  current_lng: number;
  speed: number;
  heading: number;
  status: 'active' | 'warning' | 'danger' | 'stopped';
  distance?: number;
  relativeSpeed?: number;
}

interface CollisionWarning {
  id: string;
  vehicleId: string;
  distance: number;
  relativeSpeed: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

interface TrafficUpdate {
  id: string;
  type: 'congestion' | 'accident' | 'roadwork' | 'hazard';
  location: { lat: number; lng: number };
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
}

interface UseRealtimeTrackingOptions {
  currentLocation: { lat: number; lng: number } | null;
  currentSpeed: number;
  isActive: boolean;
  onSpeak?: (message: string) => void;
}

export function useRealtimeTracking({
  currentLocation,
  currentSpeed,
  isActive,
  onSpeak,
}: UseRealtimeTrackingOptions) {
  const [nearbyVehicles, setNearbyVehicles] = useState<TrackedVehicle[]>([]);
  const [collisionWarnings, setCollisionWarnings] = useState<CollisionWarning[]>([]);
  const [trafficUpdates, setTrafficUpdates] = useState<TrafficUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const lastWarningRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { collisionWarningHaptic } = useHaptics();

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((
    lat1: number, lng1: number, lat2: number, lng2: number
  ): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Play collision warning sound
  const playWarningSound = useCallback((severity: 'low' | 'medium' | 'high' | 'critical') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Different tones for different severity levels
      const frequencies = {
        low: 440,
        medium: 660,
        high: 880,
        critical: 1100,
      };

      oscillator.frequency.value = frequencies[severity];
      oscillator.type = severity === 'critical' ? 'square' : 'sine';
      
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

      // Multiple beeps for critical warnings
      if (severity === 'critical' || severity === 'high') {
        [150, 300].forEach(delay => {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = frequencies[severity];
            osc.type = severity === 'critical' ? 'square' : 'sine';
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
          }, delay);
        });
      }
    } catch (error) {
      console.error('Failed to play warning sound:', error);
    }
  }, []);

  // Analyze collision risk
  const analyzeCollisionRisk = useCallback((
    vehicle: TrackedVehicle
  ): CollisionWarning | null => {
    if (!currentLocation || !vehicle.distance) return null;

    const relativeSpeed = Math.abs(currentSpeed - vehicle.speed);
    
    // Time to collision based on distance and relative speed
    const timeToCollision = vehicle.distance / (relativeSpeed * 1000 / 3600);

    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (vehicle.distance < 10 || timeToCollision < 2) {
      severity = 'critical';
    } else if (vehicle.distance < 30 || timeToCollision < 5) {
      severity = 'high';
    } else if (vehicle.distance < 50 || timeToCollision < 10) {
      severity = 'medium';
    } else if (vehicle.distance < 100) {
      severity = 'low';
    } else {
      return null;
    }

    return {
      id: `warning-${vehicle.vehicle_id}-${Date.now()}`,
      vehicleId: vehicle.vehicle_id,
      distance: vehicle.distance,
      relativeSpeed,
      severity,
      timestamp: Date.now(),
    };
  }, [currentLocation, currentSpeed]);

  // Fetch and process nearby vehicles
  const fetchNearbyVehicles = useCallback(async () => {
    if (!currentLocation || !isActive) return;

    try {
      const { data, error } = await supabase
        .from('vehicle_tracking')
        .select('*')
        .neq('status', 'stopped');

      if (error) throw error;

      const vehiclesWithDistance = (data || []).map(vehicle => {
        const distance = calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          vehicle.current_lat,
          vehicle.current_lng
        );
        
        return {
          ...vehicle,
          distance,
          relativeSpeed: Math.abs(currentSpeed - vehicle.speed),
        } as TrackedVehicle;
      }).filter(v => v.distance < 500); // Only show vehicles within 500m

      setNearbyVehicles(vehiclesWithDistance.sort((a, b) => 
        (a.distance || 0) - (b.distance || 0)
      ));

      // Analyze collision risks
      const warnings: CollisionWarning[] = [];
      for (const vehicle of vehiclesWithDistance) {
        const warning = analyzeCollisionRisk(vehicle);
        if (warning) {
          warnings.push(warning);
        }
      }

      // Update warnings and trigger alerts for new critical/high warnings
      if (warnings.length > 0) {
        const criticalWarnings = warnings.filter(w => 
          w.severity === 'critical' || w.severity === 'high'
        );
        
        if (criticalWarnings.length > 0 && Date.now() - lastWarningRef.current > 3000) {
          lastWarningRef.current = Date.now();
          
          const mostCritical = criticalWarnings.sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3 };
            return order[a.severity] - order[b.severity];
          })[0];

          playWarningSound(mostCritical.severity);
          collisionWarningHaptic(mostCritical.severity);
          
          toast.error(`⚠️ Collision Warning!`, {
            description: `Vehicle ${mostCritical.distance.toFixed(0)}m away - ${mostCritical.severity.toUpperCase()}`,
            duration: 5000,
          });

          if (onSpeak) {
            const message = mostCritical.severity === 'critical'
              ? `Critical collision warning! Vehicle ${Math.round(mostCritical.distance)} meters ahead!`
              : `Collision warning. Vehicle approaching at ${Math.round(mostCritical.distance)} meters.`;
            onSpeak(message);
          }
        }
      }

      setCollisionWarnings(warnings);
    } catch (error) {
      console.error('Failed to fetch nearby vehicles:', error);
    }
  }, [currentLocation, currentSpeed, isActive, calculateDistance, analyzeCollisionRisk, playWarningSound, onSpeak]);

  // Simulate traffic updates (in production, this would come from a real API)
  const fetchTrafficUpdates = useCallback(async () => {
    if (!currentLocation || !isActive) return;

    // Simulated traffic data - in production, use real traffic API
    const simulatedUpdates: TrafficUpdate[] = [
      {
        id: 'traffic-1',
        type: 'congestion',
        location: {
          lat: currentLocation.lat + 0.01,
          lng: currentLocation.lng + 0.005,
        },
        description: 'Heavy traffic ahead',
        severity: 'medium',
        timestamp: Date.now(),
      },
    ];

    // Only show updates within 5km
    const nearbyUpdates = simulatedUpdates.filter(update => {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        update.location.lat,
        update.location.lng
      );
      return distance < 5000;
    });

    setTrafficUpdates(nearbyUpdates);
  }, [currentLocation, isActive, calculateDistance]);

  // Subscribe to real-time vehicle updates
  useEffect(() => {
    if (!isActive) {
      setIsConnected(false);
      return;
    }

    const channel = supabase
      .channel('realtime-vehicle-tracking')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_tracking' },
        () => {
          fetchNearbyVehicles();
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Initial fetch
    fetchNearbyVehicles();
    fetchTrafficUpdates();

    // Periodic updates
    const interval = setInterval(() => {
      fetchNearbyVehicles();
      fetchTrafficUpdates();
    }, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [isActive, fetchNearbyVehicles, fetchTrafficUpdates]);

  return {
    nearbyVehicles,
    collisionWarnings,
    trafficUpdates,
    isConnected,
  };
}
