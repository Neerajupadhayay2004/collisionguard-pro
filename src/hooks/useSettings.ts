import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  // Alert Thresholds
  collisionWarningDistance: number; // meters
  criticalWarningDistance: number; // meters
  speedAlertThreshold: number; // km/h over limit
  
  // Sound Preferences
  soundEnabled: boolean;
  alertVolume: number; // 0-100
  voiceAlertsEnabled: boolean;
  alertTone: 'default' | 'urgent' | 'soft' | 'beep';
  
  // Offline Cache
  maxCacheSize: number; // MB
  autoCacheRoutes: boolean;
  cacheMapTiles: boolean;
  cacheDuration: number; // days
}

const DEFAULT_SETTINGS: AppSettings = {
  collisionWarningDistance: 100,
  criticalWarningDistance: 30,
  speedAlertThreshold: 10,
  soundEnabled: true,
  alertVolume: 70,
  voiceAlertsEnabled: true,
  alertTone: 'default',
  maxCacheSize: 100,
  autoCacheRoutes: true,
  cacheMapTiles: true,
  cacheDuration: 7,
};

const STORAGE_KEY = 'collision-prevention-settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }, []);

  return {
    settings,
    saveSettings,
    resetSettings,
    isLoaded,
  };
}
