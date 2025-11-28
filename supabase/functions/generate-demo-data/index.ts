import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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
        current_lat: 28.6139,
        current_lng: 77.2090,
        speed: 45.5,
        heading: 90,
        status: 'active'
      },
      {
        vehicle_id: 'V002',
        current_lat: 28.6149,
        current_lng: 77.2100,
        speed: 52.3,
        heading: 180,
        status: 'active'
      },
      {
        vehicle_id: 'V003',
        current_lat: 28.6129,
        current_lng: 77.2080,
        speed: 78.9,
        heading: 270,
        status: 'warning'
      }
    ];

    // Insert or update vehicles
    for (const vehicle of vehicles) {
      await supabase
        .from('vehicle_tracking')
        .upsert(vehicle, { onConflict: 'vehicle_id' });
    }

    // Generate a demo collision event
    const collision = {
      location_lat: 28.6139,
      location_lng: 77.2090,
      severity: 'medium',
      relative_speed: 65.4,
      distance: 45.8,
      vehicle_count: 2,
      weather_condition: 'clear',
      alert_sent: true,
      notes: 'Demo collision event'
    };

    const { data: collisionData } = await supabase
      .from('collision_events')
      .insert(collision)
      .select()
      .single();

    // Generate demo alert log
    if (collisionData) {
      await supabase
        .from('alert_logs')
        .insert({
          collision_event_id: collisionData.id,
          alert_type: 'system',
          message: 'Demo: Medium severity collision detected'
        });
    }

    console.log('Demo data generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Demo data generated successfully',
        vehicles: vehicles.length,
        collision: collisionData ? 1 : 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error generating demo data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
