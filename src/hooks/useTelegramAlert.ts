import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type AlertType = 'sos' | 'collision' | 'ride_start' | 'ride_stop' | 'speed_alert' | 'live_location';

export function useTelegramAlert() {
  const sendAlert = useCallback(async (type: AlertType, data: Record<string, any>) => {
    try {
      const { error } = await supabase.functions.invoke('telegram-alert', {
        body: { type, data },
      });
      if (error) console.error('Telegram alert error:', error);
      return !error;
    } catch (e) {
      console.error('Telegram alert failed:', e);
      return false;
    }
  }, []);

  return { sendAlert };
}
