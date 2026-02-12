import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useHaptics } from './useHaptics';
import { useTelegramAlert } from './useTelegramAlert';

interface SpeedLimit {
  limit: number;
  roadType: string;
}

interface SpeedLimitAlertOptions {
  currentSpeed: number;
  currentLocation: { lat: number; lng: number } | null;
  isActive: boolean;
  onSpeak?: (message: string) => void;
  enableTelegram?: boolean;
}

// Default speed limits by road type (in km/h)
const ROAD_SPEED_LIMITS: Record<string, number> = {
  motorway: 120,
  trunk: 100,
  primary: 80,
  secondary: 60,
  tertiary: 50,
  residential: 30,
  service: 20,
  default: 50,
};

export function useSpeedLimitAlert({
  currentSpeed,
  currentLocation,
  isActive,
  onSpeak,
  enableTelegram = true,
}: SpeedLimitAlertOptions) {
  const [currentSpeedLimit, setCurrentSpeedLimit] = useState<SpeedLimit>({
    limit: 50,
    roadType: 'default',
  });
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [overLimitAmount, setOverLimitAmount] = useState(0);
  const lastAlertRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const { speedLimitHaptic } = useHaptics();
  const { sendAlert } = useTelegramAlert();
  const telegramCooldownRef = useRef<number>(0);

  // Get speed limit for current location
  const fetchSpeedLimit = useCallback(async () => {
    if (!currentLocation) return;

    try {
      // Use Overpass API to get road type
      const query = `
        [out:json];
        way(around:20,${currentLocation.lat},${currentLocation.lng})["highway"];
        out body;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.elements && data.elements.length > 0) {
          const road = data.elements[0];
          const roadType = road.tags?.highway || 'default';
          const maxSpeed = road.tags?.maxspeed;

          // Use explicit maxspeed tag if available, otherwise use default for road type
          let limit = ROAD_SPEED_LIMITS[roadType] || ROAD_SPEED_LIMITS.default;
          
          if (maxSpeed) {
            const parsed = parseInt(maxSpeed);
            if (!isNaN(parsed)) {
              limit = parsed;
            }
          }

          setCurrentSpeedLimit({ limit, roadType });
        }
      }
    } catch (error) {
      // Use default speed limit on error
      console.log('Using default speed limit');
    }
  }, [currentLocation]);

  // Play alert sound - LOUD
  const playAlertSound = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;

      const playTone = (freq: number, startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.8, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      };

      // Triple beep - loud and urgent
      playTone(880, ctx.currentTime);
      playTone(988, ctx.currentTime + 0.2);
      playTone(1100, ctx.currentTime + 0.4);
    } catch (error) {
      console.error('Failed to play alert sound:', error);
    }
  }, []);

  // Check speed and trigger alerts
  useEffect(() => {
    if (!isActive) {
      setIsOverLimit(false);
      setOverLimitAmount(0);
      return;
    }

    const speedDiff = currentSpeed - currentSpeedLimit.limit;
    const isOver = speedDiff > 0;

    setIsOverLimit(isOver);
    setOverLimitAmount(Math.max(0, speedDiff));

    // Trigger alert if over limit (throttled to once every 10 seconds)
    if (isOver && Date.now() - lastAlertRef.current > 10000) {
      lastAlertRef.current = Date.now();

      // Play audio alert
      playAlertSound();
      
      // Haptic feedback
      speedLimitHaptic();

      // Visual toast alert
      toast.warning(`Speed Alert: ${currentSpeed.toFixed(0)} km/h`, {
        description: `Limit: ${currentSpeedLimit.limit} km/h (${currentSpeedLimit.roadType})`,
        duration: 5000,
      });

      // Voice alert
      if (onSpeak) {
        onSpeak(`Warning! You are ${Math.round(speedDiff)} kilometers per hour over the speed limit.`);
      }

      // Telegram alert (throttled to once per 30s to avoid spam)
      if (enableTelegram && currentLocation && Date.now() - telegramCooldownRef.current > 30000) {
        telegramCooldownRef.current = Date.now();
        sendAlert('speed_alert', {
          currentSpeed: currentSpeed,
          speedLimit: currentSpeedLimit.limit,
          lat: currentLocation.lat,
          lng: currentLocation.lng,
        });
      }
    }
  }, [currentSpeed, currentSpeedLimit, isActive, playAlertSound, onSpeak]);

  // Fetch speed limit when location changes significantly
  useEffect(() => {
    if (isActive && currentLocation) {
      fetchSpeedLimit();
    }
  }, [isActive, currentLocation?.lat.toFixed(3), currentLocation?.lng.toFixed(3), fetchSpeedLimit]);

  return {
    currentSpeedLimit: currentSpeedLimit.limit,
    roadType: currentSpeedLimit.roadType,
    isOverLimit,
    overLimitAmount,
  };
}
