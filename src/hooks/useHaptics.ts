import { useCallback } from 'react';

export function useHaptics() {
  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  const safeHaptic = useCallback(async (fn: () => Promise<void>) => {
    if (!isNative()) return;
    try { await fn(); } catch { /* not available */ }
  }, []);

  const impactLight = useCallback(() => safeHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  }), [safeHaptic]);

  const impactMedium = useCallback(() => safeHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Medium });
  }), [safeHaptic]);

  const impactHeavy = useCallback(() => safeHaptic(async () => {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Heavy });
  }), [safeHaptic]);

  const notificationSuccess = useCallback(() => safeHaptic(async () => {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  }), [safeHaptic]);

  const notificationWarning = useCallback(() => safeHaptic(async () => {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Warning });
  }), [safeHaptic]);

  const notificationError = useCallback(() => safeHaptic(async () => {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Error });
  }), [safeHaptic]);

  const vibrate = useCallback((duration: number = 300) => safeHaptic(async () => {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.vibrate({ duration });
  }), [safeHaptic]);

  const collisionWarningHaptic = useCallback(async (
    severity: 'low' | 'medium' | 'high' | 'critical'
  ) => {
    if (!isNative()) return;
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      switch (severity) {
        case 'critical':
          await Haptics.vibrate({ duration: 500 });
          setTimeout(() => Haptics.vibrate({ duration: 500 }).catch(() => {}), 600);
          setTimeout(() => Haptics.vibrate({ duration: 500 }).catch(() => {}), 1200);
          break;
        case 'high':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {}), 200);
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'low':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
      }
    } catch { /* not available */ }
  }, []);

  const sosHaptic = useCallback(async () => {
    if (!isNative()) return;
    try {
      const { Haptics } = await import('@capacitor/haptics');
      const short = 100, long = 300, sGap = 100, lGap = 200;
      let d = 0;
      for (let i = 0; i < 3; i++) { setTimeout(() => Haptics.vibrate({ duration: short }).catch(() => {}), d); d += short + sGap; }
      d += lGap;
      for (let i = 0; i < 3; i++) { setTimeout(() => Haptics.vibrate({ duration: long }).catch(() => {}), d); d += long + sGap; }
      d += lGap;
      for (let i = 0; i < 3; i++) { setTimeout(() => Haptics.vibrate({ duration: short }).catch(() => {}), d); d += short + sGap; }
    } catch { /* not available */ }
  }, []);

  const speedLimitHaptic = useCallback(async () => {
    if (!isNative()) return;
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Error });
      setTimeout(() => Haptics.notification({ type: NotificationType.Error }).catch(() => {}), 300);
    } catch { /* not available */ }
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
