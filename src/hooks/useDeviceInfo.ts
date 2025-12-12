import { useState, useEffect, useCallback } from 'react';
import { Device, DeviceInfo, BatteryInfo, DeviceId } from '@capacitor/device';

interface DeviceState {
  info: DeviceInfo | null;
  battery: BatteryInfo | null;
  id: DeviceId | null;
  languageCode: string | null;
  languageTag: string | null;
}

export function useDeviceInfo() {
  const [deviceState, setDeviceState] = useState<DeviceState>({
    info: null,
    battery: null,
    id: null,
    languageCode: null,
    languageTag: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  // Fetch all device information
  const fetchDeviceInfo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [info, battery, id, languageCode, languageTag] = await Promise.all([
        Device.getInfo(),
        Device.getBatteryInfo(),
        Device.getId(),
        Device.getLanguageCode(),
        Device.getLanguageTag(),
      ]);

      setDeviceState({
        info,
        battery,
        id,
        languageCode: languageCode.value,
        languageTag: languageTag.value,
      });
    } catch (err: any) {
      console.error('Failed to get device info:', err);
      setError(err.message || 'Failed to get device info');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh battery info only
  const refreshBattery = useCallback(async () => {
    try {
      const battery = await Device.getBatteryInfo();
      setDeviceState(prev => ({ ...prev, battery }));
    } catch (err) {
      console.error('Failed to refresh battery:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchDeviceInfo();
  }, [fetchDeviceInfo]);

  // Periodic battery refresh (every 60 seconds)
  useEffect(() => {
    const interval = setInterval(refreshBattery, 60000);
    return () => clearInterval(interval);
  }, [refreshBattery]);

  // Helper functions
  const getBatteryPercentage = useCallback((): number => {
    return Math.round((deviceState.battery?.batteryLevel || 0) * 100);
  }, [deviceState.battery]);

  const isCharging = useCallback((): boolean => {
    return deviceState.battery?.isCharging || false;
  }, [deviceState.battery]);

  const isBatteryLow = useCallback((threshold: number = 20): boolean => {
    return getBatteryPercentage() <= threshold && !isCharging();
  }, [getBatteryPercentage, isCharging]);

  const getPlatform = useCallback((): string => {
    return deviceState.info?.platform || 'unknown';
  }, [deviceState.info]);

  const isIOS = useCallback((): boolean => {
    return deviceState.info?.platform === 'ios';
  }, [deviceState.info]);

  const isAndroid = useCallback((): boolean => {
    return deviceState.info?.platform === 'android';
  }, [deviceState.info]);

  const isWeb = useCallback((): boolean => {
    return deviceState.info?.platform === 'web';
  }, [deviceState.info]);

  const getDeviceModel = useCallback((): string => {
    return deviceState.info?.model || 'Unknown';
  }, [deviceState.info]);

  const getOSVersion = useCallback((): string => {
    return deviceState.info?.osVersion || 'Unknown';
  }, [deviceState.info]);

  const getMemoryUsed = useCallback((): number | null => {
    return deviceState.info?.memUsed || null;
  }, [deviceState.info]);

  const getDiskFree = useCallback((): number | null => {
    return (deviceState.info as any)?.diskFree || null;
  }, [deviceState.info]);

  const getDiskTotal = useCallback((): number | null => {
    return (deviceState.info as any)?.diskTotal || null;
  }, [deviceState.info]);

  const formatBytes = useCallback((bytes: number | null): string => {
    if (bytes === null) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }, []);

  return {
    // Raw state
    deviceInfo: deviceState.info,
    batteryInfo: deviceState.battery,
    deviceId: deviceState.id,
    languageCode: deviceState.languageCode,
    languageTag: deviceState.languageTag,
    isLoading,
    error,
    
    // Actions
    refresh: fetchDeviceInfo,
    refreshBattery,
    
    // Battery helpers
    batteryPercentage: getBatteryPercentage(),
    isCharging: isCharging(),
    isBatteryLow: isBatteryLow(),
    
    // Platform helpers
    platform: getPlatform(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isWeb: isWeb(),
    isNative: isNative(),
    
    // Device helpers
    model: getDeviceModel(),
    osVersion: getOSVersion(),
    manufacturer: deviceState.info?.manufacturer || 'Unknown',
    
    // Storage helpers
    memoryUsed: getMemoryUsed(),
    diskFree: getDiskFree(),
    diskTotal: getDiskTotal(),
    formatBytes,
  };
}
