import { useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export function useHaptics() {
  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  const impactLight = useCallback(async () => {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  }, []);

  const impactMedium = useCallback(async () => {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  }, []);

  const impactHeavy = useCallback(async () => {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  }, []);

  const notificationSuccess = useCallback(async () => {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Success });
    }
  }, []);

  const notificationWarning = useCallback(async () => {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Warning });
    }
  }, []);

  const notificationError = useCallback(async () => {
    if (isNative()) {
      await Haptics.notification({ type: NotificationType.Error });
    }
  }, []);

  const vibrate = useCallback(async (duration: number = 300) => {
    if (isNative()) {
      await Haptics.vibrate({ duration });
    }
  }, []);

  // Collision-specific haptic patterns
  const collisionWarningHaptic = useCallback(async (
    severity: 'low' | 'medium' | 'high' | 'critical'
  ) => {
    if (!isNative()) return;

    switch (severity) {
      case 'critical':
        // Triple heavy vibration for critical
        await Haptics.vibrate({ duration: 500 });
        setTimeout(() => Haptics.vibrate({ duration: 500 }), 600);
        setTimeout(() => Haptics.vibrate({ duration: 500 }), 1200);
        break;
      case 'high':
        // Double heavy impact
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 200);
        break;
      case 'medium':
        // Single medium impact
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'low':
        // Light notification
        await Haptics.notification({ type: NotificationType.Warning });
        break;
    }
  }, []);

  const sosHaptic = useCallback(async () => {
    if (!isNative()) return;
    // SOS pattern: 3 short, 3 long, 3 short
    const shortDuration = 100;
    const longDuration = 300;
    const shortGap = 100;
    const longGap = 200;
    
    let delay = 0;
    
    // 3 short
    for (let i = 0; i < 3; i++) {
      setTimeout(() => Haptics.vibrate({ duration: shortDuration }), delay);
      delay += shortDuration + shortGap;
    }
    
    delay += longGap;
    
    // 3 long
    for (let i = 0; i < 3; i++) {
      setTimeout(() => Haptics.vibrate({ duration: longDuration }), delay);
      delay += longDuration + shortGap;
    }
    
    delay += longGap;
    
    // 3 short
    for (let i = 0; i < 3; i++) {
      setTimeout(() => Haptics.vibrate({ duration: shortDuration }), delay);
      delay += shortDuration + shortGap;
    }
  }, []);

  const speedLimitHaptic = useCallback(async () => {
    if (!isNative()) return;
    await Haptics.notification({ type: NotificationType.Error });
    setTimeout(() => Haptics.notification({ type: NotificationType.Error }), 300);
  }, []);

  return {
    impactLight,
    impactMedium,
    impactHeavy,
    notificationSuccess,
    notificationWarning,
    notificationError,
    vibrate,
    collisionWarningHaptic,
    sosHaptic,
    speedLimitHaptic,
    isNative,
  };
}
