import { useState, useEffect, useCallback } from 'react';
import { Network, ConnectionStatus, ConnectionType } from '@capacitor/network';
import { toast } from 'sonner';

interface NetworkInfo {
  connected: boolean;
  connectionType: ConnectionType;
  isWifi: boolean;
  isCellular: boolean;
  isOffline: boolean;
}

interface UseNetworkStatusOptions {
  onStatusChange?: (status: NetworkInfo) => void;
  showToasts?: boolean;
}

export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const { onStatusChange, showToasts = true } = options;
  
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    connected: true,
    connectionType: 'unknown' as ConnectionType,
    isWifi: false,
    isCellular: false,
    isOffline: false,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  const parseConnectionStatus = useCallback((status: ConnectionStatus): NetworkInfo => {
    const connected = status.connected;
    const connectionType = status.connectionType;
    
    return {
      connected,
      connectionType,
      isWifi: connectionType === 'wifi',
      isCellular: connectionType === 'cellular',
      isOffline: !connected,
    };
  }, []);

  const getStatus = useCallback(async (): Promise<NetworkInfo> => {
    try {
      if (isNative()) {
        const status = await Network.getStatus();
        return parseConnectionStatus(status);
      } else {
        // Web fallback
        const connected = navigator.onLine;
        return {
          connected,
          connectionType: connected ? 'wifi' : 'none',
          isWifi: connected,
          isCellular: false,
          isOffline: !connected,
        };
      }
    } catch (error) {
      console.error('Error getting network status:', error);
      return {
        connected: navigator.onLine,
        connectionType: 'unknown' as ConnectionType,
        isWifi: false,
        isCellular: false,
        isOffline: !navigator.onLine,
      };
    }
  }, [parseConnectionStatus]);

  useEffect(() => {
    let listenerHandle: any = null;

    const initNetwork = async () => {
      // Get initial status
      const initialStatus = await getStatus();
      setNetworkInfo(initialStatus);
      setIsInitialized(true);

      if (isNative()) {
        // Listen for changes on native
        listenerHandle = await Network.addListener('networkStatusChange', (status) => {
          const info = parseConnectionStatus(status);
          setNetworkInfo(info);
          onStatusChange?.(info);

          if (showToasts) {
            if (!info.connected) {
              toast.warning('Network disconnected - Offline mode active', {
                id: 'network-status',
                duration: 5000,
              });
            } else {
              toast.success(`Connected via ${info.connectionType}`, {
                id: 'network-status',
                duration: 3000,
              });
            }
          }
        });
      } else {
        // Web fallback listeners
        const handleOnline = () => {
          const info: NetworkInfo = {
            connected: true,
            connectionType: 'wifi',
            isWifi: true,
            isCellular: false,
            isOffline: false,
          };
          setNetworkInfo(info);
          onStatusChange?.(info);
          if (showToasts) {
            toast.success('Back online', { id: 'network-status' });
          }
        };

        const handleOffline = () => {
          const info: NetworkInfo = {
            connected: false,
            connectionType: 'none',
            isWifi: false,
            isCellular: false,
            isOffline: true,
          };
          setNetworkInfo(info);
          onStatusChange?.(info);
          if (showToasts) {
            toast.warning('You are offline', { id: 'network-status' });
          }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      }
    };

    initNetwork();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [getStatus, parseConnectionStatus, onStatusChange, showToasts]);

  // Connection quality estimation
  const getConnectionQuality = useCallback((): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' => {
    if (!networkInfo.connected) return 'offline';
    if (networkInfo.isWifi) return 'excellent';
    if (networkInfo.isCellular) {
      // Could be enhanced with actual connection API if available
      return 'good';
    }
    return 'fair';
  }, [networkInfo]);

  return {
    ...networkInfo,
    isInitialized,
    getStatus,
    connectionQuality: getConnectionQuality(),
    isNative: isNative(),
  };
}
