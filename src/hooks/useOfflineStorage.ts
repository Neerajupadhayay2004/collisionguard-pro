import { useState, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';

interface StorageItem<T> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

export function useOfflineStorage() {
  const [isLoading, setIsLoading] = useState(false);

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  // Set a value in storage
  const setItem = useCallback(async <T>(
    key: string, 
    value: T, 
    ttlMs?: number
  ): Promise<void> => {
    try {
      setIsLoading(true);
      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      };

      const jsonValue = JSON.stringify(item);

      if (isNative()) {
        await Preferences.set({ key, value: jsonValue });
      } else {
        localStorage.setItem(key, jsonValue);
      }
    } catch (error) {
      console.error('Failed to set storage item:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get a value from storage
  const getItem = useCallback(async <T>(key: string): Promise<T | null> => {
    try {
      setIsLoading(true);
      let jsonValue: string | null = null;

      if (isNative()) {
        const result = await Preferences.get({ key });
        jsonValue = result.value;
      } else {
        jsonValue = localStorage.getItem(key);
      }

      if (!jsonValue) return null;

      const item: StorageItem<T> = JSON.parse(jsonValue);

      // Check if expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await removeItem(key);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('Failed to get storage item:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Remove a value from storage
  const removeItem = useCallback(async (key: string): Promise<void> => {
    try {
      if (isNative()) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Failed to remove storage item:', error);
    }
  }, []);

  // Clear all storage
  const clear = useCallback(async (): Promise<void> => {
    try {
      if (isNative()) {
        await Preferences.clear();
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }, []);

  // Get all keys
  const keys = useCallback(async (): Promise<string[]> => {
    try {
      if (isNative()) {
        const result = await Preferences.keys();
        return result.keys;
      } else {
        return Object.keys(localStorage);
      }
    } catch (error) {
      console.error('Failed to get storage keys:', error);
      return [];
    }
  }, []);

  // Store route data for offline use
  const cacheRouteData = useCallback(async (
    routeId: string,
    routeData: {
      coordinates: { lat: number; lng: number }[];
      dangerZones: { lat: number; lng: number; reason: string }[];
      destination: string;
    }
  ): Promise<void> => {
    await setItem(`route_${routeId}`, routeData, 7 * 24 * 60 * 60 * 1000); // 7 days TTL
  }, [setItem]);

  // Get cached route data
  const getCachedRoute = useCallback(async (routeId: string) => {
    return getItem<{
      coordinates: { lat: number; lng: number }[];
      dangerZones: { lat: number; lng: number; reason: string }[];
      destination: string;
    }>(`route_${routeId}`);
  }, [getItem]);

  // Store settings for offline use
  const saveSettings = useCallback(async (settings: Record<string, any>): Promise<void> => {
    await setItem('app_settings', settings);
  }, [setItem]);

  // Get cached settings
  const getSettings = useCallback(async (): Promise<Record<string, any> | null> => {
    return getItem<Record<string, any>>('app_settings');
  }, [getItem]);

  // Cache collision events for offline sync
  const cacheCollisionEvent = useCallback(async (event: {
    id: string;
    severity: string;
    location: { lat: number; lng: number };
    timestamp: number;
    synced: boolean;
  }): Promise<void> => {
    const events = await getItem<any[]>('offline_collision_events') || [];
    events.push(event);
    await setItem('offline_collision_events', events);
  }, [getItem, setItem]);

  // Get pending collision events for sync
  const getPendingCollisionEvents = useCallback(async () => {
    const events = await getItem<any[]>('offline_collision_events') || [];
    return events.filter(e => !e.synced);
  }, [getItem]);

  // Mark collision events as synced
  const markEventsSynced = useCallback(async (eventIds: string[]): Promise<void> => {
    const events = await getItem<any[]>('offline_collision_events') || [];
    const updatedEvents = events.map(e => 
      eventIds.includes(e.id) ? { ...e, synced: true } : e
    );
    await setItem('offline_collision_events', updatedEvents);
  }, [getItem, setItem]);

  // Cache emergency contacts for offline access
  const cacheEmergencyContacts = useCallback(async (contacts: any[]): Promise<void> => {
    await setItem('emergency_contacts_cache', contacts);
  }, [setItem]);

  // Get cached emergency contacts
  const getCachedEmergencyContacts = useCallback(async () => {
    return getItem<any[]>('emergency_contacts_cache');
  }, [getItem]);

  return {
    isLoading,
    isNative: isNative(),
    // Generic operations
    setItem,
    getItem,
    removeItem,
    clear,
    keys,
    // App-specific operations
    cacheRouteData,
    getCachedRoute,
    saveSettings,
    getSettings,
    cacheCollisionEvent,
    getPendingCollisionEvents,
    markEventsSynced,
    cacheEmergencyContacts,
    getCachedEmergencyContacts,
  };
}
