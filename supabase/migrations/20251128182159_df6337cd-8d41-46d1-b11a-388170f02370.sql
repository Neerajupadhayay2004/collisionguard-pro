-- Create collision_events table to store detected collisions
CREATE TABLE public.collision_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  relative_speed NUMERIC NOT NULL,
  distance NUMERIC NOT NULL,
  vehicle_count INTEGER NOT NULL DEFAULT 2,
  weather_condition TEXT,
  alert_sent BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicle_tracking table for real-time vehicle monitoring
CREATE TABLE public.vehicle_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id TEXT NOT NULL UNIQUE,
  current_lat NUMERIC NOT NULL,
  current_lng NUMERIC NOT NULL,
  speed NUMERIC NOT NULL DEFAULT 0,
  heading NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'warning', 'danger', 'stopped')),
  last_update TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert_logs table for tracking all alerts
CREATE TABLE public.alert_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collision_event_id UUID REFERENCES public.collision_events(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('audio', 'visual', 'system')),
  message TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.collision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (monitoring dashboard)
CREATE POLICY "Allow public read access to collision events"
ON public.collision_events FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to collision events"
ON public.collision_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public read access to vehicle tracking"
ON public.vehicle_tracking FOR SELECT
USING (true);

CREATE POLICY "Allow public insert/update to vehicle tracking"
ON public.vehicle_tracking FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update to vehicle tracking"
ON public.vehicle_tracking FOR UPDATE
USING (true);

CREATE POLICY "Allow public read access to alert logs"
ON public.alert_logs FOR SELECT
USING (true);

CREATE POLICY "Allow public insert to alert logs"
ON public.alert_logs FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_collision_events_timestamp ON public.collision_events(timestamp DESC);
CREATE INDEX idx_collision_events_severity ON public.collision_events(severity);
CREATE INDEX idx_vehicle_tracking_vehicle_id ON public.vehicle_tracking(vehicle_id);
CREATE INDEX idx_vehicle_tracking_status ON public.vehicle_tracking(status);
CREATE INDEX idx_alert_logs_triggered_at ON public.alert_logs(triggered_at DESC);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.collision_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_logs;

-- Set replica identity for realtime updates
ALTER TABLE public.collision_events REPLICA IDENTITY FULL;
ALTER TABLE public.vehicle_tracking REPLICA IDENTITY FULL;
ALTER TABLE public.alert_logs REPLICA IDENTITY FULL;