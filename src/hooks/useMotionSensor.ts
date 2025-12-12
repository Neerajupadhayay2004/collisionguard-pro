import { useState, useEffect, useCallback, useRef } from 'react';
import { Motion, AccelListenerEvent, OrientationListenerEvent } from '@capacitor/motion';
import { useHaptics } from './useHaptics';
import { toast } from 'sonner';

interface MotionData {
  acceleration: {
    x: number;
    y: number;
    z: number;
  };
  accelerationIncludingGravity: {
    x: number;
    y: number;
    z: number;
  };
  rotationRate: {
    alpha: number;
    beta: number;
    gamma: number;
  };
  orientation: {
    alpha: number;
    beta: number;
    gamma: number;
  };
}

interface CollisionDetectionResult {
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impactForce: number;
  direction: string;
  timestamp: number;
}

interface UseMotionSensorOptions {
  enableCollisionDetection?: boolean;
  collisionThreshold?: number; // G-force threshold for collision detection
  onCollisionDetected?: (result: CollisionDetectionResult) => void;
  onSpeak?: (message: string) => void;
}

export function useMotionSensor(options: UseMotionSensorOptions = {}) {
  const {
    enableCollisionDetection = true,
    collisionThreshold = 2.5, // Default 2.5G for collision detection
    onCollisionDetected,
    onSpeak,
  } = options;

  const [motionData, setMotionData] = useState<MotionData>({
    acceleration: { x: 0, y: 0, z: 0 },
    accelerationIncludingGravity: { x: 0, y: 0, z: 0 },
    rotationRate: { alpha: 0, beta: 0, gamma: 0 },
    orientation: { alpha: 0, beta: 0, gamma: 0 },
  });
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastCollision, setLastCollision] = useState<CollisionDetectionResult | null>(null);
  const lastCollisionTimeRef = useRef<number>(0);
  const { collisionWarningHaptic } = useHaptics();

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  // Calculate total G-force from acceleration
  const calculateGForce = useCallback((x: number, y: number, z: number): number => {
    return Math.sqrt(x * x + y * y + z * z) / 9.81;
  }, []);

  // Determine collision direction
  const getCollisionDirection = useCallback((x: number, y: number, z: number): string => {
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const absZ = Math.abs(z);

    if (absZ > absX && absZ > absY) {
      return z > 0 ? 'front' : 'rear';
    } else if (absX > absY) {
      return x > 0 ? 'right' : 'left';
    } else {
      return y > 0 ? 'top' : 'bottom';
    }
  }, []);

  // Analyze motion data for collision
  const analyzeForCollision = useCallback((accel: { x: number; y: number; z: number }) => {
    if (!enableCollisionDetection) return;

    const gForce = calculateGForce(accel.x, accel.y, accel.z);
    const now = Date.now();

    // Prevent multiple detections within 3 seconds
    if (now - lastCollisionTimeRef.current < 3000) return;

    if (gForce >= collisionThreshold) {
      lastCollisionTimeRef.current = now;

      let severity: 'low' | 'medium' | 'high' | 'critical';
      if (gForce >= 8) {
        severity = 'critical';
      } else if (gForce >= 5) {
        severity = 'high';
      } else if (gForce >= 3.5) {
        severity = 'medium';
      } else {
        severity = 'low';
      }

      const result: CollisionDetectionResult = {
        detected: true,
        severity,
        impactForce: gForce,
        direction: getCollisionDirection(accel.x, accel.y, accel.z),
        timestamp: now,
      };

      setLastCollision(result);
      
      // Trigger haptic feedback
      collisionWarningHaptic(severity);

      // Show toast
      toast.error(`Impact Detected!`, {
        description: `${severity.toUpperCase()} impact (${gForce.toFixed(1)}G) from ${result.direction}`,
        duration: 5000,
      });

      // Voice alert
      if (onSpeak) {
        onSpeak(`Warning! ${severity} impact detected from the ${result.direction}. ${gForce.toFixed(1)} G-force.`);
      }

      // Callback
      if (onCollisionDetected) {
        onCollisionDetected(result);
      }
    }
  }, [enableCollisionDetection, collisionThreshold, calculateGForce, getCollisionDirection, collisionWarningHaptic, onSpeak, onCollisionDetected]);

  // Start listening to motion events
  const startListening = useCallback(async () => {
    try {
      if (isNative()) {
        // Request permission on iOS
        try {
          await (DeviceMotionEvent as any).requestPermission?.();
        } catch (e) {
          // Permission API not available or denied
        }

        // Add acceleration listener
        await Motion.addListener('accel', (event: AccelListenerEvent) => {
          const newAccel = {
            x: event.acceleration.x || 0,
            y: event.acceleration.y || 0,
            z: event.acceleration.z || 0,
          };
          const newAccelWithGravity = {
            x: event.accelerationIncludingGravity.x || 0,
            y: event.accelerationIncludingGravity.y || 0,
            z: event.accelerationIncludingGravity.z || 0,
          };
          const newRotation = {
            alpha: event.rotationRate.alpha || 0,
            beta: event.rotationRate.beta || 0,
            gamma: event.rotationRate.gamma || 0,
          };

          setMotionData(prev => ({
            ...prev,
            acceleration: newAccel,
            accelerationIncludingGravity: newAccelWithGravity,
            rotationRate: newRotation,
          }));

          // Analyze for collision using acceleration without gravity
          analyzeForCollision(newAccel);
        });

        // Add orientation listener
        await Motion.addListener('orientation', (event: OrientationListenerEvent) => {
          setMotionData(prev => ({
            ...prev,
            orientation: {
              alpha: event.alpha || 0,
              beta: event.beta || 0,
              gamma: event.gamma || 0,
            },
          }));
        });

        setIsListening(true);
        setHasPermission(true);
        toast.success('Motion sensors activated');
      } else {
        // Web fallback using DeviceMotionEvent
        const handleMotion = (event: DeviceMotionEvent) => {
          const accel = event.acceleration || { x: 0, y: 0, z: 0 };
          const accelGravity = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
          const rotation = event.rotationRate || { alpha: 0, beta: 0, gamma: 0 };

          const newAccel = {
            x: accel.x || 0,
            y: accel.y || 0,
            z: accel.z || 0,
          };

          setMotionData(prev => ({
            ...prev,
            acceleration: newAccel,
            accelerationIncludingGravity: {
              x: accelGravity.x || 0,
              y: accelGravity.y || 0,
              z: accelGravity.z || 0,
            },
            rotationRate: {
              alpha: rotation.alpha || 0,
              beta: rotation.beta || 0,
              gamma: rotation.gamma || 0,
            },
          }));

          analyzeForCollision(newAccel);
        };

        const handleOrientation = (event: DeviceOrientationEvent) => {
          setMotionData(prev => ({
            ...prev,
            orientation: {
              alpha: event.alpha || 0,
              beta: event.beta || 0,
              gamma: event.gamma || 0,
            },
          }));
        };

        window.addEventListener('devicemotion', handleMotion);
        window.addEventListener('deviceorientation', handleOrientation);
        setIsListening(true);
        setHasPermission(true);
      }
    } catch (error) {
      console.error('Failed to start motion sensors:', error);
      setHasPermission(false);
      toast.error('Failed to access motion sensors');
    }
  }, [analyzeForCollision]);

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      if (isNative()) {
        await Motion.removeAllListeners();
      } else {
        // Web cleanup handled by component unmount
      }
      setIsListening(false);
    } catch (error) {
      console.error('Failed to stop motion sensors:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isListening, stopListening]);

  return {
    motionData,
    isListening,
    hasPermission,
    lastCollision,
    startListening,
    stopListening,
    isNative: isNative(),
    // Convenience getters
    acceleration: motionData.acceleration,
    orientation: motionData.orientation,
    rotationRate: motionData.rotationRate,
    gForce: calculateGForce(
      motionData.acceleration.x,
      motionData.acceleration.y,
      motionData.acceleration.z
    ),
  };
}
