import { useState, useEffect, useCallback, useRef } from 'react';
import { Geolocation, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { toast } from 'sonner';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number | null;
}

interface UseNativeGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  enableBackgroundTracking?: boolean;
}

export function useNativeGeolocation(options: UseNativeGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    enableBackgroundTracking = false,
  } = options;

  const [location, setLocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const watchIdRef = useRef<string | null>(null);

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  // Check and request permissions
  const checkPermissions = useCallback(async () => {
    try {
      if (isNative()) {
        const status = await Geolocation.checkPermissions();
        if (status.location === 'granted' || status.coarseLocation === 'granted') {
          setHasPermission(true);
          return true;
        } else if (status.location === 'denied') {
          setHasPermission(false);
          return false;
        } else {
          // Request permission
          const requested = await Geolocation.requestPermissions();
          const granted = requested.location === 'granted' || requested.coarseLocation === 'granted';
          setHasPermission(granted);
          return granted;
        }
      } else {
        // Web browser - permission will be requested on first use
        setHasPermission(true);
        return true;
      }
    } catch (err) {
      console.error('Permission check failed:', err);
      setHasPermission(false);
      return false;
    }
  }, []);

  // Get current position
  const getCurrentPosition = useCallback(async (): Promise<GeolocationState | null> => {
    try {
      const hasPerms = await checkPermissions();
      if (!hasPerms) {
        setError('Location permission denied');
        return null;
      }

      let position: Position;

      if (isNative()) {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy,
          timeout,
          maximumAge,
        });
      } else {
        // Fallback to web API
        position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
              coords: pos.coords,
              timestamp: pos.timestamp,
            }),
            reject,
            { enableHighAccuracy, timeout, maximumAge }
          );
        });
      }

      const newLocation: GeolocationState = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      };

      setLocation(newLocation);
      setError(null);
      return newLocation;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get location';
      setError(errorMessage);
      console.error('Geolocation error:', err);
      return null;
    }
  }, [checkPermissions, enableHighAccuracy, timeout, maximumAge]);

  // Start watching position (background tracking)
  const startTracking = useCallback(async () => {
    try {
      const hasPerms = await checkPermissions();
      if (!hasPerms) {
        toast.error('Location permission required for tracking');
        return;
      }

      if (watchIdRef.current) {
        await stopTracking();
      }

      if (isNative()) {
        const callback: WatchPositionCallback = (position, err) => {
          if (err) {
            setError(err.message);
            return;
          }

          if (position) {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              timestamp: position.timestamp,
            });
            setError(null);
          }
        };

        watchIdRef.current = await Geolocation.watchPosition(
          {
            enableHighAccuracy,
            timeout,
            maximumAge,
          },
          callback
        );
      } else {
        // Web API fallback
        const webWatchId = navigator.geolocation.watchPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
              timestamp: position.timestamp,
            });
            setError(null);
          },
          (err) => setError(err.message),
          { enableHighAccuracy, timeout, maximumAge }
        );
        watchIdRef.current = webWatchId.toString();
      }

      setIsTracking(true);
      toast.success('Location tracking started');
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to start location tracking');
    }
  }, [checkPermissions, enableHighAccuracy, timeout, maximumAge]);

  // Stop watching position
  const stopTracking = useCallback(async () => {
    try {
      if (watchIdRef.current) {
        if (isNative()) {
          await Geolocation.clearWatch({ id: watchIdRef.current });
        } else {
          navigator.geolocation.clearWatch(parseInt(watchIdRef.current));
        }
        watchIdRef.current = null;
      }
      setIsTracking(false);
    } catch (err) {
      console.error('Failed to stop tracking:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        stopTracking();
      }
    };
  }, [stopTracking]);

  // Auto-start background tracking if enabled
  useEffect(() => {
    if (enableBackgroundTracking) {
      startTracking();
    }
  }, [enableBackgroundTracking, startTracking]);

  return {
    location,
    error,
    isTracking,
    hasPermission,
    getCurrentPosition,
    startTracking,
    stopTracking,
    checkPermissions,
    isNative: isNative(),
    // Convenience getters
    latitude: location.latitude,
    longitude: location.longitude,
    speed: location.speed,
    heading: location.heading,
  };
}
