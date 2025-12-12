import { useState, useEffect, useCallback } from 'react';

interface CachedRoute {
  id: string;
  origin: { lat: number; lng: number };
  destination: string;
  coordinates: { lat: number; lng: number }[];
  timestamp: number;
}

interface CachedTile {
  key: string;
  blob: Blob;
  timestamp: number;
}

const DB_NAME = 'collision-prevention-offline';
const DB_VERSION = 1;
const ROUTES_STORE = 'routes';
const TILES_STORE = 'tiles';

export function useOfflineMode() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [cachedRoutes, setCachedRoutes] = useState<CachedRoute[]>([]);
  const [cacheSize, setCacheSize] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize IndexedDB
  const initDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(ROUTES_STORE)) {
          db.createObjectStore(ROUTES_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(TILES_STORE)) {
          db.createObjectStore(TILES_STORE, { keyPath: 'key' });
        }
      };
    });
  }, []);

  // Cache a route for offline use
  const cacheRoute = useCallback(async (
    origin: { lat: number; lng: number },
    destination: string,
    coordinates: { lat: number; lng: number }[]
  ) => {
    try {
      const db = await initDB();
      const transaction = db.transaction(ROUTES_STORE, 'readwrite');
      const store = transaction.objectStore(ROUTES_STORE);

      const route: CachedRoute = {
        id: `${origin.lat.toFixed(4)}_${origin.lng.toFixed(4)}_${destination}`,
        origin,
        destination,
        coordinates,
        timestamp: Date.now(),
      };

      store.put(route);
      
      // Also cache map tiles for this route
      await cacheTilesForRoute(coordinates);
      
      // Update cached routes list
      await loadCachedRoutes();
    } catch (error) {
      console.error('Failed to cache route:', error);
    }
  }, [initDB]);

  // Cache map tiles for a route
  const cacheTilesForRoute = useCallback(async (coordinates: { lat: number; lng: number }[]) => {
    const db = await initDB();
    const transaction = db.transaction(TILES_STORE, 'readwrite');
    const store = transaction.objectStore(TILES_STORE);

    // Calculate tile coordinates for zoom levels 12-16
    for (const coord of coordinates) {
      for (let zoom = 12; zoom <= 16; zoom++) {
        const tileX = Math.floor((coord.lng + 180) / 360 * Math.pow(2, zoom));
        const tileY = Math.floor((1 - Math.log(Math.tan(coord.lat * Math.PI / 180) + 1 / Math.cos(coord.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
        
        const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
        const tileKey = `${zoom}/${tileX}/${tileY}`;

        try {
          const response = await fetch(tileUrl);
          if (response.ok) {
            const blob = await response.blob();
            store.put({ key: tileKey, blob, timestamp: Date.now() });
          }
        } catch (error) {
          // Skip failed tiles silently
        }
      }
    }
  }, [initDB]);

  // Get cached route
  const getCachedRoute = useCallback(async (
    origin: { lat: number; lng: number },
    destination: string
  ): Promise<CachedRoute | null> => {
    try {
      const db = await initDB();
      const transaction = db.transaction(ROUTES_STORE, 'readonly');
      const store = transaction.objectStore(ROUTES_STORE);
      const id = `${origin.lat.toFixed(4)}_${origin.lng.toFixed(4)}_${destination}`;

      return new Promise((resolve) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }, [initDB]);

  // Load all cached routes
  const loadCachedRoutes = useCallback(async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction(ROUTES_STORE, 'readonly');
      const store = transaction.objectStore(ROUTES_STORE);

      const request = store.getAll();
      request.onsuccess = () => {
        setCachedRoutes(request.result || []);
      };
    } catch {
      setCachedRoutes([]);
    }
  }, [initDB]);

  // Calculate cache size
  const calculateCacheSize = useCallback(async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction([ROUTES_STORE, TILES_STORE], 'readonly');
      
      let totalSize = 0;

      const routesStore = transaction.objectStore(ROUTES_STORE);
      const routesRequest = routesStore.getAll();
      routesRequest.onsuccess = () => {
        totalSize += JSON.stringify(routesRequest.result).length;
      };

      const tilesStore = transaction.objectStore(TILES_STORE);
      const tilesRequest = tilesStore.getAll();
      tilesRequest.onsuccess = () => {
        for (const tile of tilesRequest.result) {
          totalSize += tile.blob.size;
        }
        setCacheSize(totalSize);
      };
    } catch {
      setCacheSize(0);
    }
  }, [initDB]);

  // Clear all cached data
  const clearCache = useCallback(async () => {
    try {
      const db = await initDB();
      const transaction = db.transaction([ROUTES_STORE, TILES_STORE], 'readwrite');
      transaction.objectStore(ROUTES_STORE).clear();
      transaction.objectStore(TILES_STORE).clear();
      setCachedRoutes([]);
      setCacheSize(0);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [initDB]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      await initDB();
      await loadCachedRoutes();
      await calculateCacheSize();
      setIsInitialized(true);
    };
    initialize();
  }, [initDB, loadCachedRoutes, calculateCacheSize]);

  return {
    isOffline,
    isInitialized,
    cachedRoutes,
    cacheSize,
    cacheRoute,
    getCachedRoute,
    clearCache,
    loadCachedRoutes,
  };
}
