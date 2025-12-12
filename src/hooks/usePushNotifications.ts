import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  PushNotifications, 
  Token, 
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { toast } from 'sonner';

interface UsePushNotificationsOptions {
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationAction?: (action: ActionPerformed) => void;
  autoRegister?: boolean;
}

export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const {
    onNotificationReceived,
    onNotificationAction,
    autoRegister = true,
  } = options;

  const [token, setToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [notifications, setNotifications] = useState<PushNotificationSchema[]>([]);
  const isRegisteredRef = useRef(false);

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  // Request permission and register for push notifications
  const register = useCallback(async (): Promise<boolean> => {
    if (!isNative()) {
      // Web fallback - use Notification API
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setHasPermission(permission === 'granted');
        return permission === 'granted';
      }
      return false;
    }

    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        // Request permission
        const result = await PushNotifications.requestPermissions();
        if (result.receive !== 'granted') {
          setHasPermission(false);
          toast.error('Push notification permission denied');
          return false;
        }
      } else if (permStatus.receive !== 'granted') {
        setHasPermission(false);
        return false;
      }

      setHasPermission(true);

      // Register with push notification service
      await PushNotifications.register();
      isRegisteredRef.current = true;
      
      return true;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      setHasPermission(false);
      return false;
    }
  }, []);

  // Set up listeners
  useEffect(() => {
    if (!isNative()) return;

    // On registration success
    const registrationListener = PushNotifications.addListener(
      'registration',
      (token: Token) => {
        console.log('Push registration success, token:', token.value);
        setToken(token.value);
        toast.success('Push notifications enabled');
      }
    );

    // On registration error
    const registrationErrorListener = PushNotifications.addListener(
      'registrationError',
      (error) => {
        console.error('Push registration error:', error);
        toast.error('Failed to register for notifications');
      }
    );

    // On notification received while app is in foreground
    const notificationListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        setNotifications(prev => [notification, ...prev]);
        
        // Show in-app toast for foreground notifications
        toast.info(notification.title || 'New Notification', {
          description: notification.body,
          duration: 5000,
        });

        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // On notification action (tap)
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action:', action);
        
        if (onNotificationAction) {
          onNotificationAction(action);
        }

        // Handle specific action types
        const data = action.notification.data;
        if (data?.type === 'collision_warning') {
          // Navigate to dashboard or show alert
          toast.error('Collision Warning!', {
            description: data.message || 'Check the app for details',
          });
        } else if (data?.type === 'sos_alert') {
          toast.error('SOS Alert Active', {
            description: 'Emergency services have been notified',
          });
        }
      }
    );

    // Auto-register if enabled
    if (autoRegister && !isRegisteredRef.current) {
      register();
    }

    // Cleanup
    return () => {
      registrationListener.then(l => l.remove());
      registrationErrorListener.then(l => l.remove());
      notificationListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [autoRegister, register, onNotificationReceived, onNotificationAction]);

  // Send local notification (for testing or local alerts)
  const sendLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> => {
    if (!isNative()) {
      // Web fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, data });
      }
      return;
    }

    try {
      // For local notifications, we'd use @capacitor/local-notifications
      // This is a placeholder for the push notification system
      toast.info(title, { description: body });
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }, []);

  // Clear all delivered notifications
  const clearNotifications = useCallback(async (): Promise<void> => {
    if (!isNative()) return;

    try {
      await PushNotifications.removeAllDeliveredNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, []);

  // Get delivered notifications
  const getDeliveredNotifications = useCallback(async () => {
    if (!isNative()) return [];

    try {
      const result = await PushNotifications.getDeliveredNotifications();
      return result.notifications;
    } catch (error) {
      console.error('Failed to get delivered notifications:', error);
      return [];
    }
  }, []);

  return {
    token,
    hasPermission,
    notifications,
    register,
    sendLocalNotification,
    clearNotifications,
    getDeliveredNotifications,
    isNative: isNative(),
  };
}
