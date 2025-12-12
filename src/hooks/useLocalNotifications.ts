import { useState, useEffect, useCallback } from 'react';
import { 
  LocalNotifications, 
  ScheduleOptions,
  LocalNotificationSchema,
  ActionPerformed,
  Channel,
} from '@capacitor/local-notifications';
import { toast } from 'sonner';

interface ScheduledNotification {
  id: number;
  title: string;
  body: string;
  scheduledAt: Date;
  type: 'reminder' | 'alert' | 'scheduled';
}

interface UseLocalNotificationsOptions {
  onNotificationReceived?: (notification: LocalNotificationSchema) => void;
  onNotificationAction?: (action: ActionPerformed) => void;
}

export function useLocalNotifications(options: UseLocalNotificationsOptions = {}) {
  const {
    onNotificationReceived,
    onNotificationAction,
  } = options;

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [pendingNotifications, setPendingNotifications] = useState<ScheduledNotification[]>([]);

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
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
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        // Create notification channels for Android
        await createChannels();
      }
      
      return granted;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      setHasPermission(false);
      return false;
    }
  }, []);

  // Create notification channels (Android)
  const createChannels = useCallback(async () => {
    if (!isNative()) return;

    try {
      const channels: Channel[] = [
        {
          id: 'collision-alerts',
          name: 'Collision Alerts',
          description: 'Critical collision and impact warnings',
          importance: 5, // IMPORTANCE_HIGH
          visibility: 1, // VISIBILITY_PUBLIC
          sound: 'alert_sound',
          vibration: true,
        },
        {
          id: 'reminders',
          name: 'Reminders',
          description: 'Scheduled reminders and tips',
          importance: 3, // IMPORTANCE_DEFAULT
          visibility: 0, // VISIBILITY_PRIVATE
        },
        {
          id: 'trip-updates',
          name: 'Trip Updates',
          description: 'Trip status and navigation updates',
          importance: 3,
          visibility: 1,
        },
      ];

      for (const channel of channels) {
        await LocalNotifications.createChannel(channel);
      }
    } catch (error) {
      console.error('Failed to create notification channels:', error);
    }
  }, []);

  // Send immediate notification
  const sendNotification = useCallback(async (
    title: string,
    body: string,
    options?: {
      id?: number;
      channelId?: string;
      smallIcon?: string;
      largeIcon?: string;
      actionTypeId?: string;
      extra?: Record<string, any>;
    }
  ): Promise<void> => {
    if (!isNative()) {
      // Web fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      } else {
        toast.info(title, { description: body });
      }
      return;
    }

    try {
      const notificationId = options?.id || Date.now();
      
      await LocalNotifications.schedule({
        notifications: [
          {
            id: notificationId,
            title,
            body,
            channelId: options?.channelId || 'reminders',
            smallIcon: options?.smallIcon,
            largeIcon: options?.largeIcon,
            actionTypeId: options?.actionTypeId,
            extra: options?.extra,
          },
        ],
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Fallback to toast
      toast.info(title, { description: body });
    }
  }, []);

  // Schedule notification for future time
  const scheduleNotification = useCallback(async (
    title: string,
    body: string,
    scheduleAt: Date,
    options?: {
      id?: number;
      channelId?: string;
      repeats?: boolean;
      every?: 'year' | 'month' | 'two-weeks' | 'week' | 'day' | 'hour' | 'minute';
      extra?: Record<string, any>;
    }
  ): Promise<number> => {
    const notificationId = options?.id || Date.now();

    if (!isNative()) {
      // Web fallback - use setTimeout
      const delay = scheduleAt.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
          } else {
            toast.info(title, { description: body });
          }
        }, delay);
      }
      return notificationId;
    }

    try {
      const scheduleOptions: ScheduleOptions = {
        notifications: [
          {
            id: notificationId,
            title,
            body,
            schedule: {
              at: scheduleAt,
              repeats: options?.repeats || false,
              every: options?.every,
              allowWhileIdle: true,
            },
            channelId: options?.channelId || 'reminders',
            extra: options?.extra,
          },
        ],
      };

      await LocalNotifications.schedule(scheduleOptions);

      // Track pending notification
      setPendingNotifications(prev => [
        ...prev,
        { id: notificationId, title, body, scheduledAt: scheduleAt, type: 'scheduled' }
      ]);

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }, []);

  // Cancel a scheduled notification
  const cancelNotification = useCallback(async (notificationId: number): Promise<void> => {
    if (!isNative()) return;

    try {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      setPendingNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }, []);

  // Cancel all notifications
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    if (!isNative()) return;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      setPendingNotifications([]);
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }, []);

  // Get pending notifications
  const getPendingNotifications = useCallback(async () => {
    if (!isNative()) return [];

    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }, []);

  // Pre-built notification types

  // Schedule a ride reminder
  const scheduleRideReminder = useCallback(async (
    message: string,
    reminderTime: Date
  ): Promise<number> => {
    return scheduleNotification(
      '🚗 Ride Reminder',
      message,
      reminderTime,
      { channelId: 'reminders' }
    );
  }, [scheduleNotification]);

  // Schedule a break reminder (for fatigue)
  const scheduleBreakReminder = useCallback(async (
    minutesFromNow: number = 60
  ): Promise<number> => {
    const reminderTime = new Date(Date.now() + minutesFromNow * 60 * 1000);
    return scheduleNotification(
      '☕ Take a Break',
      `You've been driving for ${minutesFromNow} minutes. Consider taking a short break for your safety.`,
      reminderTime,
      { channelId: 'reminders' }
    );
  }, [scheduleNotification]);

  // Send collision alert
  const sendCollisionAlert = useCallback(async (
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: string
  ): Promise<void> => {
    const titles = {
      low: '⚠️ Caution',
      medium: '⚠️ Warning',
      high: '🚨 Alert',
      critical: '🚨 CRITICAL ALERT',
    };

    await sendNotification(titles[severity], details, {
      channelId: 'collision-alerts',
      extra: { severity, type: 'collision' },
    });
  }, [sendNotification]);

  // Send trip update
  const sendTripUpdate = useCallback(async (
    title: string,
    message: string
  ): Promise<void> => {
    await sendNotification(title, message, {
      channelId: 'trip-updates',
    });
  }, [sendNotification]);

  // Schedule speed check reminder
  const scheduleSpeedCheckReminder = useCallback(async (
    intervalMinutes: number = 30
  ): Promise<number> => {
    const reminderTime = new Date(Date.now() + intervalMinutes * 60 * 1000);
    return scheduleNotification(
      '🚦 Speed Check',
      'Remember to monitor your speed and stay within limits.',
      reminderTime,
      { 
        channelId: 'reminders',
        repeats: true,
        every: 'hour',
      }
    );
  }, [scheduleNotification]);

  // Setup listeners
  useEffect(() => {
    if (!isNative()) return;

    // Listener for when a notification is received while app is open
    const receivedListener = LocalNotifications.addListener(
      'localNotificationReceived',
      (notification: LocalNotificationSchema) => {
        console.log('Local notification received:', notification);
        
        // Show in-app toast
        toast.info(notification.title || 'Notification', {
          description: notification.body,
        });

        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Listener for when user taps on a notification
    const actionListener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Notification action performed:', action);

        if (onNotificationAction) {
          onNotificationAction(action);
        }

        // Handle specific notification types
        const extra = action.notification.extra;
        if (extra?.type === 'collision') {
          toast.error('Collision Alert', {
            description: 'Check the app for collision details.',
          });
        }
      }
    );

    // Check permission on mount
    LocalNotifications.checkPermissions().then(result => {
      setHasPermission(result.display === 'granted');
    });

    return () => {
      receivedListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [onNotificationReceived, onNotificationAction]);

  return {
    hasPermission,
    pendingNotifications,
    requestPermission,
    sendNotification,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    getPendingNotifications,
    isNative: isNative(),
    // Pre-built notification types
    scheduleRideReminder,
    scheduleBreakReminder,
    sendCollisionAlert,
    sendTripUpdate,
    scheduleSpeedCheckReminder,
  };
}
