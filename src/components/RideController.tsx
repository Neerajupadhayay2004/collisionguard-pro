import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { MapPin, Play, Square, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RideControllerProps {
  onRideStateChange: (isActive: boolean) => void;
  detectedSpeed: number;
}

const RideController = ({ onRideStateChange, detectedSpeed }: RideControllerProps) => {
  const [isRideActive, setIsRideActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const watchIdRef = useRef<number | null>(null);
  const vehicleIdRef = useRef<string>(`V${Date.now()}`);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    return () => {
      stopRide();
    };
  }, []);

  useEffect(() => {
    if (isRideActive && currentLocation) {
      updateVehicleTracking();
      checkCollisionRisk();
    }
  }, [currentLocation, detectedSpeed, isRideActive]);

  const startRide = async () => {
    try {
      // Request geolocation permission
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        return;
      }

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setCurrentLocation(newLocation);
          
          // Calculate distance if we have previous location
          if (lastLocationRef.current) {
            const dist = calculateDistance(
              lastLocationRef.current.lat,
              lastLocationRef.current.lng,
              newLocation.lat,
              newLocation.lng
            );
            setDistance(prev => prev + dist);
          }
          
          lastLocationRef.current = newLocation;
          
          // Use GPS speed or camera detected speed
          const speed = position.coords.speed 
            ? position.coords.speed * 3.6 // Convert m/s to km/h
            : detectedSpeed;
          setCurrentSpeed(speed);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast.error('Failed to get location');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );

      setIsRideActive(true);
      onRideStateChange(true);
      toast.success('Ride started - Monitoring active');

      // Insert initial vehicle tracking
      await supabase.from('vehicle_tracking').insert({
        vehicle_id: vehicleIdRef.current,
        current_lat: 0,
        current_lng: 0,
        speed: 0,
        heading: 0,
        status: 'active'
      });

    } catch (error) {
      console.error('Error starting ride:', error);
      toast.error('Failed to start ride');
    }
  };

  const stopRide = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Update vehicle status to stopped
    if (vehicleIdRef.current) {
      await supabase
        .from('vehicle_tracking')
        .update({ status: 'stopped' })
        .eq('vehicle_id', vehicleIdRef.current);
    }

    setIsRideActive(false);
    onRideStateChange(false);
    setDistance(0);
    lastLocationRef.current = null;
    toast.info('Ride stopped');
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value: number): number => {
    return value * Math.PI / 180;
  };

  const updateVehicleTracking = async () => {
    if (!currentLocation) return;

    try {
      await supabase
        .from('vehicle_tracking')
        .upsert({
          vehicle_id: vehicleIdRef.current,
          current_lat: currentLocation.lat,
          current_lng: currentLocation.lng,
          speed: Math.max(currentSpeed, detectedSpeed),
          heading: 0, // Would need compass data
          status: currentSpeed > 80 ? 'warning' : 'active',
          last_update: new Date().toISOString()
        }, { onConflict: 'vehicle_id' });
    } catch (error) {
      console.error('Error updating vehicle tracking:', error);
    }
  };

  const checkCollisionRisk = async () => {
    if (!currentLocation || currentSpeed < 20) return;

    // Check for nearby vehicles with high relative speed
    const { data: nearbyVehicles } = await supabase
      .from('vehicle_tracking')
      .select('*')
      .neq('vehicle_id', vehicleIdRef.current);

    if (!nearbyVehicles) return;

    nearbyVehicles.forEach(async (vehicle) => {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        vehicle.current_lat,
        vehicle.current_lng
      ) * 1000; // Convert to meters

      const relativeSpeed = Math.abs(currentSpeed - vehicle.speed);

      // Check collision risk
      if (distance < 100 && relativeSpeed > 30) {
        const severity = distance < 30 ? 'critical' : distance < 50 ? 'high' : 'medium';
        
        // Log collision event
        await supabase.from('collision_events').insert({
          location_lat: currentLocation.lat,
          location_lng: currentLocation.lng,
          severity,
          relative_speed: relativeSpeed,
          distance,
          vehicle_count: 2,
          alert_sent: true
        });
      }
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold font-mono flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Ride Monitor
          </h3>
          <div className={`px-3 py-1 rounded-full text-xs font-mono ${
            isRideActive ? 'bg-safe/20 text-safe' : 'bg-muted text-muted-foreground'
          }`}>
            {isRideActive ? 'ACTIVE' : 'INACTIVE'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-xs text-muted-foreground font-mono mb-1">Current Speed</p>
            <p className="text-2xl font-bold font-mono">
              {Math.max(currentSpeed, detectedSpeed).toFixed(0)} km/h
            </p>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-xs text-muted-foreground font-mono mb-1">Distance</p>
            <p className="text-2xl font-bold font-mono">{distance.toFixed(2)} km</p>
          </div>
        </div>

        {currentLocation && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground font-mono mb-1">Current Location</p>
                <p className="text-sm font-mono">
                  {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={isRideActive ? stopRide : startRide}
          className={`w-full font-mono ${isRideActive ? 'bg-danger hover:bg-danger/90' : ''}`}
          size="lg"
        >
          {isRideActive ? (
            <>
              <Square className="mr-2 h-5 w-5" />
              Stop Ride
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Start Ride
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default RideController;
