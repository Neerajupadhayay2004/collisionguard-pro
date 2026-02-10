import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error("Telegram credentials not configured");
    }

    const { type, data } = await req.json();

    let message = "";
    let latitude: number | undefined;
    let longitude: number | undefined;

    switch (type) {
      case "sos":
        message = `🚨 *SOS EMERGENCY ALERT* 🚨\n\n` +
          `⏰ Time: ${new Date().toLocaleString()}\n` +
          `📍 Location: ${data.lat?.toFixed(6)}, ${data.lng?.toFixed(6)}\n` +
          `🗺️ Map: https://www.google.com/maps?q=${data.lat},${data.lng}\n` +
          `💬 Message: ${data.message || "Emergency SOS triggered!"}\n\n` +
          `⚠️ IMMEDIATE ASSISTANCE REQUIRED`;
        latitude = data.lat;
        longitude = data.lng;
        break;

      case "collision":
        message = `⚠️ *COLLISION ALERT* ⚠️\n\n` +
          `🔴 Severity: ${data.severity?.toUpperCase()}\n` +
          `📍 Location: ${data.lat?.toFixed(6)}, ${data.lng?.toFixed(6)}\n` +
          `🗺️ Map: https://www.google.com/maps?q=${data.lat},${data.lng}\n` +
          `🚗 Relative Speed: ${data.relativeSpeed?.toFixed(0)} km/h\n` +
          `📏 Distance: ${data.distance?.toFixed(0)} m\n` +
          `⏰ Time: ${new Date().toLocaleString()}`;
        latitude = data.lat;
        longitude = data.lng;
        break;

      case "ride_start":
        message = `🟢 *RIDE STARTED*\n\n` +
          `📍 Start: ${data.lat?.toFixed(6)}, ${data.lng?.toFixed(6)}\n` +
          `🗺️ Map: https://www.google.com/maps?q=${data.lat},${data.lng}\n` +
          `⏰ Time: ${new Date().toLocaleString()}\n` +
          `🚗 Monitoring active...`;
        latitude = data.lat;
        longitude = data.lng;
        break;

      case "ride_stop":
        message = `🔴 *RIDE ENDED*\n\n` +
          `📏 Distance: ${data.distance?.toFixed(2)} km\n` +
          `⏱️ Duration: ${data.duration || "N/A"}\n` +
          `🏎️ Max Speed: ${data.maxSpeed?.toFixed(0)} km/h\n` +
          `⏰ Time: ${new Date().toLocaleString()}`;
        break;

      case "speed_alert":
        message = `🏎️ *SPEED LIMIT EXCEEDED*\n\n` +
          `💨 Speed: ${data.currentSpeed?.toFixed(0)} km/h\n` +
          `🚧 Limit: ${data.speedLimit} km/h\n` +
          `📍 Location: ${data.lat?.toFixed(6)}, ${data.lng?.toFixed(6)}\n` +
          `⏰ Time: ${new Date().toLocaleString()}`;
        break;

      case "live_location":
        message = `📍 *LIVE LOCATION UPDATE*\n\n` +
          `🚗 Speed: ${data.speed?.toFixed(0)} km/h\n` +
          `📍 Coords: ${data.lat?.toFixed(6)}, ${data.lng?.toFixed(6)}\n` +
          `🗺️ Map: https://www.google.com/maps?q=${data.lat},${data.lng}\n` +
          `⏰ ${new Date().toLocaleString()}`;
        latitude = data.lat;
        longitude = data.lng;
        break;

      default:
        message = `ℹ️ *CollisionGuard Pro Alert*\n\n${data.message || "System notification"}`;
    }

    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    // Send text message
    const textResp = await fetch(`${telegramUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    if (!textResp.ok) {
      const err = await textResp.text();
      console.error("Telegram sendMessage error:", err);
      throw new Error(`Telegram API error: ${err}`);
    }

    // Send location pin for relevant alerts
    if (latitude && longitude) {
      await fetch(`${telegramUrl}/sendLocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          latitude,
          longitude,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("telegram-alert error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
