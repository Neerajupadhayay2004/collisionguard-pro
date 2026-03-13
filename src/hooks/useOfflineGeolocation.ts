import { useState, useCallback, useRef, useEffect } from 'react';

interface OfflineLocation {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
  source: 'gps' | 'cached' | 'ip' | 'manual';
}

const LOCATION_CACHE_KEY = 'eco_rider_last_location';
const LOCATION_HISTORY_KEY = 'eco_rider_location_history';

export function useOfflineGeolocation() {
  const [location, setLocation] = useState<OfflineLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const historyRef = useRef<OfflineLocation[]>([]);

  // Load cached location on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as OfflineLocation;
        // Use cached location if less than 30 minutes old
        if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
          setLocation({ ...parsed, source: 'cached' });
        }
      }
      const history = localStorage.getItem(LOCATION_HISTORY_KEY);
      if (history) historyRef.current = JSON.parse(history);
    } catch {}
  }, []);

  // Save location to cache
  const cacheLocation = useCallback((loc: OfflineLocation) => {
    try {
      localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(loc));
      // Keep last 100 locations for offline route reconstruction
      historyRef.current = [...historyRef.current.slice(-99), loc];
      localStorage.setItem(LOCATION_HISTORY_KEY, JSON.stringify(historyRef.current));
    } catch {}
  }, []);

  // Get current position (works offline with fallback)
  const getCurrentPosition = useCallback(async (): Promise<OfflineLocation | null> => {
    // Try GPS first
    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
          });
        });

        const loc: OfflineLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ? pos.coords.speed * 3.6 : null,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
          source: 'gps',
        };

        setLocation(loc);
        setError(null);
        cacheLocation(loc);
        return loc;
      } catch (err: any) {
        console.warn('GPS failed, trying fallback:', err.message);
      }
    }

    // Fallback: use cached location
    try {
      const cached = localStorage.getItem(LOCATION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as OfflineLocation;
        const loc = { ...parsed, source: 'cached' as const, timestamp: Date.now() };
        setLocation(loc);
        setError('Using cached location (offline)');
        return loc;
      }
    } catch {}

    // Last resort: default location
    const defaultLoc: OfflineLocation = {
      lat: 28.6139,
      lng: 77.2090,
      accuracy: 10000,
      speed: null,
      heading: null,
      timestamp: Date.now(),
      source: 'manual',
    };
    setLocation(defaultLoc);
    setError('Using default location');
    return defaultLoc;
  }, [cacheLocation]);

  // Start continuous tracking (works offline by estimating from last known)
  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null) return;

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc: OfflineLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            speed: pos.coords.speed ? pos.coords.speed * 3.6 : null,
            heading: pos.coords.heading,
            timestamp: pos.timestamp,
            source: 'gps',
          };
          setLocation(loc);
          setError(null);
          cacheLocation(loc);
        },
        (err) => {
          setError(err.message);
          // Keep last known location active
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    setIsTracking(true);
  }, [cacheLocation]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Get location history for offline route display
  const getLocationHistory = useCallback((): OfflineLocation[] => {
    return historyRef.current;
  }, []);

  // Dead reckoning: estimate position from last known + speed + heading
  const estimatePosition = useCallback((): OfflineLocation | null => {
    if (!location || !location.speed || !location.heading) return location;
    
    const elapsed = (Date.now() - location.timestamp) / 1000; // seconds
    if (elapsed > 300) return location; // Don't estimate beyond 5 min

    const speedMs = (location.speed / 3.6); // km/h to m/s
    const distM = speedMs * elapsed;
    const headingRad = (location.heading * Math.PI) / 180;

    const dLat = (distM * Math.cos(headingRad)) / 111320;
    const dLng = (distM * Math.sin(headingRad)) / (111320 * Math.cos(location.lat * Math.PI / 180));

    return {
      ...location,
      lat: location.lat + dLat,
      lng: location.lng + dLng,
      accuracy: location.accuracy + distM * 0.5, // accuracy degrades
      source: 'cached',
      timestamp: Date.now(),
    };
  }, [location]);

  // Cleanup
  useEffect(() => {
    return () => { stopTracking(); };
  }, [stopTracking]);

  return {
    location,
    isTracking,
    error,
    getCurrentPosition,
    startTracking,
    stopTracking,
    getLocationHistory,
    estimatePosition,
    latitude: location?.lat ?? null,
    longitude: location?.lng ?? null,
    speed: location?.speed ?? null,
    heading: location?.heading ?? null,
    locationSource: location?.source ?? null,
  };
}
