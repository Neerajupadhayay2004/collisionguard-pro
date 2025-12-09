import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Cloud, Sun, CloudRain, Wind, Thermometer, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  alerts: string[];
}

interface WeatherTrafficAlertProps {
  currentLocation: { lat: number; lng: number } | null;
}

const WeatherTrafficAlert = ({ currentLocation }: WeatherTrafficAlertProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [trafficAlerts, setTrafficAlerts] = useState<string[]>([]);

  useEffect(() => {
    if (currentLocation) {
      fetchWeather();
      checkTrafficAlerts();
    }
  }, [currentLocation]);

  const fetchWeather = async () => {
    if (!currentLocation) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-weather', {
        body: { lat: currentLocation.lat, lng: currentLocation.lng }
      });

      if (error) throw error;
      
      setWeather({
        temperature: data.main?.temp || 0,
        condition: data.weather?.[0]?.main || 'Unknown',
        humidity: data.main?.humidity || 0,
        windSpeed: data.wind?.speed || 0,
        visibility: data.visibility ? data.visibility / 1000 : 10,
        alerts: generateWeatherAlerts(data)
      });
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWeatherAlerts = (data: any): string[] => {
    const alerts: string[] = [];
    
    if (data.weather?.[0]?.main === 'Rain') {
      alerts.push('Wet roads - reduce speed and increase following distance');
    }
    if (data.visibility && data.visibility < 1000) {
      alerts.push('Low visibility - use fog lights and drive slowly');
    }
    if (data.wind?.speed > 10) {
      alerts.push('High winds - be cautious with steering');
    }
    if (data.main?.temp < 5) {
      alerts.push('Cold conditions - watch for ice on roads');
    }
    
    return alerts;
  };

  const checkTrafficAlerts = async () => {
    // Fetch recent collision events to generate traffic alerts
    const { data: collisions } = await supabase
      .from('collision_events')
      .select('*')
      .gte('timestamp', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    const alerts: string[] = [];
    
    if (collisions && collisions.length > 0) {
      const criticalCount = collisions.filter(c => c.severity === 'critical' || c.severity === 'high').length;
      
      if (criticalCount > 2) {
        alerts.push(`High collision activity in area - ${criticalCount} incidents reported`);
      }
      if (collisions.length > 5) {
        alerts.push('Increased traffic incidents - drive with caution');
      }
    }
    
    setTrafficAlerts(alerts);
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'rain':
      case 'drizzle':
        return <CloudRain className="h-8 w-8 text-blue-400" />;
      case 'clear':
        return <Sun className="h-8 w-8 text-warning" />;
      case 'clouds':
        return <Cloud className="h-8 w-8 text-muted-foreground" />;
      default:
        return <Cloud className="h-8 w-8 text-muted-foreground" />;
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <h3 className="font-bold font-mono">Weather & Traffic</h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={fetchWeather}
            disabled={isLoading || !currentLocation}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {weather ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                {getWeatherIcon(weather.condition)}
                <div>
                  <p className="text-2xl font-bold font-mono">{weather.temperature.toFixed(0)}°C</p>
                  <p className="text-xs text-muted-foreground">{weather.condition}</p>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <div className="flex items-center gap-1 justify-end">
                  <Wind className="h-3 w-3" />
                  <span>{weather.windSpeed.toFixed(1)} m/s</span>
                </div>
                <div className="flex items-center gap-1 justify-end">
                  <Thermometer className="h-3 w-3" />
                  <span>{weather.humidity}% humidity</span>
                </div>
              </div>
            </div>

            {(weather.alerts.length > 0 || trafficAlerts.length > 0) && (
              <div className="space-y-2">
                {weather.alerts.map((alert, index) => (
                  <div key={`weather-${index}`} className="bg-warning/10 border border-warning/20 p-3 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <p className="text-xs">{alert}</p>
                  </div>
                ))}
                {trafficAlerts.map((alert, index) => (
                  <div key={`traffic-${index}`} className="bg-danger/10 border border-danger/20 p-3 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-danger mt-0.5 flex-shrink-0" />
                    <p className="text-xs">{alert}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            {currentLocation ? 'Loading weather data...' : 'Start ride to see weather info'}
          </div>
        )}
      </div>
    </Card>
  );
};

export default WeatherTrafficAlert;
