import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate demo vehicles
    const vehicles = [
      {
        vehicle_id: 'V001',
        current_lat: 28.6139 + (Math.random() - 0.5) * 0.02,
        current_lng: 77.2090 + (Math.random() - 0.5) * 0.02,
        speed: 45 + Math.random() * 30,
        heading: Math.random() * 360,
        status: 'active'
      },
      {
        vehicle_id: 'V002',
        current_lat: 28.6149 + (Math.random() - 0.5) * 0.02,
        current_lng: 77.2100 + (Math.random() - 0.5) * 0.02,
        speed: 35 + Math.random() * 40,
        heading: Math.random() * 360,
        status: 'active'
      },
      {
        vehicle_id: 'V003',
        current_lat: 28.6129 + (Math.random() - 0.5) * 0.02,
        current_lng: 77.2080 + (Math.random() - 0.5) * 0.02,
        speed: 70 + Math.random() * 30,
        heading: Math.random() * 360,
        status: 'warning'
      }
    ];

    // Insert or update vehicles
    for (const vehicle of vehicles) {
      await supabase
        .from('vehicle_tracking')
        .upsert(vehicle, { onConflict: 'vehicle_id' });
    }

    // Generate demo collision events
    const severities = ['low', 'medium', 'high', 'critical'];
    const collisions = Array.from({ length: 3 }, () => ({
      location_lat: 28.6139 + (Math.random() - 0.5) * 0.05,
      location_lng: 77.2090 + (Math.random() - 0.5) * 0.05,
      severity: severities[Math.floor(Math.random() * severities.length)],
      relative_speed: 30 + Math.random() * 50,
      distance: 10 + Math.random() * 90,
      vehicle_count: 2,
      weather_condition: 'clear',
      alert_sent: true,
      notes: 'Demo collision event'
    }));

    for (const collision of collisions) {
      const { data: collisionData } = await supabase
        .from('collision_events')
        .insert(collision)
        .select()
        .single();

      if (collisionData) {
        await supabase
          .from('alert_logs')
          .insert({
            collision_event_id: collisionData.id,
            alert_type: 'system',
            message: `Demo: ${collision.severity} severity collision detected`
          });
      }
    }

    // Generate demo trip history
    const trips = Array.from({ length: 3 }, (_, i) => {
      const startTime = new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + (30 + Math.random() * 60) * 60 * 1000);
      return {
        vehicle_id: `DEMO_V${i + 1}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        start_lat: 28.6139 + (Math.random() - 0.5) * 0.02,
        start_lng: 77.2090 + (Math.random() - 0.5) * 0.02,
        end_lat: 28.6139 + (Math.random() - 0.5) * 0.03,
        end_lng: 77.2090 + (Math.random() - 0.5) * 0.03,
        total_distance: 5 + Math.random() * 20,
        max_speed: 60 + Math.random() * 40,
        avg_speed: 30 + Math.random() * 30,
        safety_score: 60 + Math.floor(Math.random() * 40),
        collision_count: Math.floor(Math.random() * 2),
      };
    });

    for (const trip of trips) {
      await supabase.from('trip_history').insert(trip);
    }

    console.log('Demo data generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Demo data generated successfully',
        vehicles: vehicles.length,
        collisions: collisions.length,
        trips: trips.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    console.error('Error generating demo data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
