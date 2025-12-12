import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Bell, Clock, Plus, Trash2, BellRing } from 'lucide-react';
import { useLocalNotifications } from '@/hooks/useLocalNotifications';
import { toast } from 'sonner';

interface NotificationManagerProps {
  isRideActive: boolean;
}

const NotificationManager = ({ isRideActive }: NotificationManagerProps) => {
  const [showScheduler, setShowScheduler] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(30);

  const {
    hasPermission,
    pendingNotifications,
    requestPermission,
    scheduleBreakReminder,
    scheduleSpeedCheckReminder,
    cancelNotification,
    cancelAllNotifications,
    sendNotification,
    isNative,
  } = useLocalNotifications();

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Notification permission granted');
    } else {
      toast.error('Notification permission denied');
    }
  };

  const handleScheduleBreakReminder = async () => {
    try {
      await scheduleBreakReminder(reminderMinutes);
      toast.success(`Break reminder set for ${reminderMinutes} minutes`);
      setShowScheduler(false);
    } catch (error) {
      toast.error('Failed to schedule reminder');
    }
  };

  const handleScheduleSpeedCheck = async () => {
    try {
      await scheduleSpeedCheckReminder(30);
      toast.success('Speed check reminders enabled every 30 minutes');
    } catch (error) {
      toast.error('Failed to schedule speed checks');
    }
  };

  const handleTestNotification = async () => {
    await sendNotification(
      '🔔 Test Notification',
      'Local notifications are working correctly!',
      { channelId: 'reminders' }
    );
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-bold font-mono text-sm">Notifications</h3>
            {isNative && (
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                NATIVE
              </span>
            )}
          </div>
          {hasPermission === false && (
            <Button size="sm" variant="outline" onClick={handleRequestPermission}>
              Enable
            </Button>
          )}
        </div>

        {hasPermission ? (
          <div className="space-y-3">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowScheduler(!showScheduler)}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                Break Reminder
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleScheduleSpeedCheck}
                className="text-xs"
              >
                <BellRing className="h-3 w-3 mr-1" />
                Speed Checks
              </Button>
            </div>

            {/* Break Reminder Scheduler */}
            {showScheduler && (
              <div className="bg-muted/50 p-3 rounded-lg space-y-2 animate-fade-in">
                <p className="text-xs text-muted-foreground">Remind me in:</p>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <Button
                      key={mins}
                      size="sm"
                      variant={reminderMinutes === mins ? 'default' : 'outline'}
                      onClick={() => setReminderMinutes(mins)}
                      className="flex-1 text-xs"
                    >
                      {mins}m
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={handleScheduleBreakReminder}
                  className="w-full"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Schedule
                </Button>
              </div>
            )}

            {/* Pending Notifications */}
            {pendingNotifications.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-muted-foreground">
                    Scheduled ({pendingNotifications.length})
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={cancelAllNotifications}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {pendingNotifications.slice(0, 3).map((notif) => (
                    <div
                      key={notif.id}
                      className="bg-muted/30 p-2 rounded text-xs flex items-center justify-between"
                    >
                      <div className="truncate flex-1">
                        <p className="font-medium truncate">{notif.title}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {notif.scheduledAt.toLocaleTimeString()}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 ml-2"
                        onClick={() => cancelNotification(notif.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleTestNotification}
              className="w-full text-xs text-muted-foreground"
            >
              Send Test Notification
            </Button>
          </div>
        ) : hasPermission === null ? (
          <div className="text-center py-3">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-xs text-muted-foreground">Checking permissions...</p>
          </div>
        ) : (
          <div className="text-center py-3">
            <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-xs text-muted-foreground mb-2">
              Enable notifications for reminders
            </p>
            <Button size="sm" onClick={handleRequestPermission}>
              Enable Notifications
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default NotificationManager;
