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
    const { severity, speed, distance } = await req.json();
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Generate alert message based on severity
    const alertMessage = generateAlertMessage(severity, speed, distance);

    console.log('Generating audio alert:', alertMessage);

    // Use Gemini to generate text-to-speech
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Create a brief, urgent audio alert message for a collision warning. Severity: ${severity}, Speed: ${speed} km/h. Keep it under 15 words and urgent.`
            }]
          }]
        })
      }
    );

    const data = await response.json();
    const textAlert = data.candidates?.[0]?.content?.parts?.[0]?.text || alertMessage;

    console.log('Generated text alert:', textAlert);

    // Return the alert message (in production, you'd use a TTS API)
    return new Response(
      JSON.stringify({ 
        message: textAlert,
        severity,
        audioBase64: null // Would contain actual audio in production
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateAlertMessage(severity: string, speed: number, distance: number): string {
  const severityMessages = {
    critical: `CRITICAL ALERT! Collision imminent at ${speed} km/h!`,
    high: `HIGH RISK! Reduce speed immediately. ${speed} km/h detected.`,
    medium: `WARNING: Potential collision risk. Current speed ${speed} km/h.`,
    low: `CAUTION: Monitor distance. Speed ${speed} km/h.`
  };

  return severityMessages[severity as keyof typeof severityMessages] || 'Collision warning detected';
}
