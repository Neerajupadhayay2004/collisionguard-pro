import { useCallback, useEffect } from 'react';

// Lazy-load Capacitor haptics to avoid crashes in web browsers
let H: any = null;
let IS: any = {};
let NT: any = {};
let loaded = false;

const loadHaptics = async () => {
  if (loaded) return;
  loaded = true;
  try {
    const mod = await import('@capacitor/haptics');
    H = mod.Haptics;
    IS = mod.ImpactStyle;
    NT = mod.NotificationType;
  } catch {
    // Not available in web
  }
};

export function useHaptics() {
  useEffect(() => { loadHaptics(); }, []);

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  const impactLight = useCallback(async () => {
    if (isNative() && H) await H.impact({ style: IS.Light });
  }, []);

  const impactMedium = useCallback(async () => {
    if (isNative() && H) await H.impact({ style: IS.Medium });
  }, []);

  const impactHeavy = useCallback(async () => {
    if (isNative() && H) await H.impact({ style: IS.Heavy });
  }, []);

  const notificationSuccess = useCallback(async () => {
    if (isNative() && H) await H.notification({ type: NT.Success });
  }, []);

  const notificationWarning = useCallback(async () => {
    if (isNative() && H) await H.notification({ type: NT.Warning });
  }, []);

  const notificationError = useCallback(async () => {
    if (isNative() && H) await H.notification({ type: NT.Error });
  }, []);

  const vibrate = useCallback(async (duration: number = 300) => {
    if (isNative() && H) await H.vibrate({ duration });
  }, []);

  const collisionWarningHaptic = useCallback(async (
    severity: 'low' | 'medium' | 'high' | 'critical'
  ) => {
    if (!isNative() || !H) return;
    switch (severity) {
      case 'critical':
        await H.vibrate({ duration: 500 });
        setTimeout(() => H.vibrate({ duration: 500 }), 600);
        setTimeout(() => H.vibrate({ duration: 500 }), 1200);
        break;
      case 'high':
        await H.impact({ style: IS.Heavy });
        setTimeout(() => H.impact({ style: IS.Heavy }), 200);
        break;
      case 'medium':
        await H.impact({ style: IS.Medium });
        break;
      case 'low':
        await H.notification({ type: NT.Warning });
        break;
    }
  }, []);

  const sosHaptic = useCallback(async () => {
    if (!isNative() || !H) return;
    const shortDuration = 100;
    const longDuration = 300;
    const shortGap = 100;
    const longGap = 200;
    let delay = 0;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => H.vibrate({ duration: shortDuration }), delay);
      delay += shortDuration + shortGap;
    }
    delay += longGap;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => H.vibrate({ duration: longDuration }), delay);
      delay += longDuration + shortGap;
    }
    delay += longGap;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => H.vibrate({ duration: shortDuration }), delay);
      delay += shortDuration + shortGap;
    }
  }, []);

  const speedLimitHaptic = useCallback(async () => {
    if (!isNative() || !H) return;
    await H.notification({ type: NT.Error });
    setTimeout(() => H.notification({ type: NT.Error }), 300);
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
