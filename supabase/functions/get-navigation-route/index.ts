import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startLat, startLng, endLat, endLng, collisionPoints } = await req.json();

    console.log(`Getting route from ${startLat},${startLng} to ${endLat},${endLng}`);

    // Use OSRM for routing (free, no API key needed)
    const routeResponse = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`
    );

    if (!routeResponse.ok) {
      throw new Error('Failed to get route');
    }

    const routeData = await routeResponse.json();

    if (!routeData.routes || routeData.routes.length === 0) {
      throw new Error('No route found');
    }

    const route = routeData.routes[0];
    const coordinates = route.geometry.coordinates;
    
    // Calculate safety score based on collision points proximity
    let safetyScore = 100;
    const dangerZones: Array<{ lat: number; lng: number; reason: string }> = [];

    if (collisionPoints && collisionPoints.length > 0) {
      coordinates.forEach((coord: number[]) => {
        collisionPoints.forEach((collision: any) => {
          const distance = calculateDistance(coord[1], coord[0], collision.lat, collision.lng);
          if (distance < 0.5) { // Within 500m
            safetyScore -= 5;
            if (!dangerZones.find(z => z.lat === collision.lat && z.lng === collision.lng)) {
              dangerZones.push({
                lat: collision.lat,
                lng: collision.lng,
                reason: `Collision reported: ${collision.severity} severity`
              });
            }
          }
        });
      });
    }

    safetyScore = Math.max(0, safetyScore);

    // Extract turn-by-turn directions
    const directions = route.legs[0].steps.map((step: any, index: number) => ({
      instruction: step.maneuver.instruction || formatManeuver(step.maneuver),
      distance: step.distance,
      duration: step.duration,
      type: step.maneuver.type,
      modifier: step.maneuver.modifier,
      name: step.name || 'Unknown road',
      coordinates: step.geometry.coordinates
    }));

    const result = {
      coordinates: coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] })),
      distance: route.distance,
      duration: route.duration,
      directions,
      safetyScore,
      dangerZones
    };

    console.log(`Route calculated: ${route.distance}m, ${directions.length} steps, safety: ${safetyScore}%`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}

function formatManeuver(maneuver: any): string {
  const type = maneuver.type;
  const modifier = maneuver.modifier;
  
  if (type === 'turn') {
    return `Turn ${modifier}`;
  } else if (type === 'depart') {
    return 'Start your journey';
  } else if (type === 'arrive') {
    return 'You have arrived';
  } else if (type === 'continue') {
    return 'Continue straight';
  } else if (type === 'roundabout') {
    return `Enter roundabout and take the ${modifier} exit`;
  }
  return `${type} ${modifier || ''}`.trim();
}
