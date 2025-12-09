-- Create trip_history table
CREATE TABLE public.trip_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  start_lat NUMERIC NOT NULL,
  start_lng NUMERIC NOT NULL,
  end_lat NUMERIC,
  end_lng NUMERIC,
  total_distance NUMERIC NOT NULL DEFAULT 0,
  max_speed NUMERIC NOT NULL DEFAULT 0,
  avg_speed NUMERIC NOT NULL DEFAULT 0,
  safety_score INTEGER NOT NULL DEFAULT 100,
  collision_count INTEGER NOT NULL DEFAULT 0,
  route_points JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emergency_contacts table
CREATE TABLE public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sos_alerts table
CREATE TABLE public.sos_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_lat NUMERIC NOT NULL,
  location_lng NUMERIC NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  message TEXT,
  trip_id UUID REFERENCES public.trip_history(id)
);

-- Enable RLS
ALTER TABLE public.trip_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Public access policies
CREATE POLICY "Allow public access to trip_history" ON public.trip_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to emergency_contacts" ON public.emergency_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to sos_alerts" ON public.sos_alerts FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;