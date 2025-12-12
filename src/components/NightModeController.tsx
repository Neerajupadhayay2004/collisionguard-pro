import { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface NightModeControllerProps {
  isRideActive: boolean;
}

const NightModeController = ({ isRideActive }: NightModeControllerProps) => {
  const [isNightMode, setIsNightMode] = useState(false);
  const [autoNightMode, setAutoNightMode] = useState(true);
  const [brightness, setBrightness] = useState(70);
  const [contrastBoost, setContrastBoost] = useState(20);

  // Check if it's nighttime based on time
  const checkNightTime = useCallback(() => {
    const hour = new Date().getHours();
    return hour >= 19 || hour < 6; // 7 PM to 6 AM
  }, []);

  // Auto-enable night mode
  useEffect(() => {
    if (autoNightMode && isRideActive) {
      const isNight = checkNightTime();
      setIsNightMode(isNight);
    }
  }, [autoNightMode, isRideActive, checkNightTime]);

  // Apply night mode styles
  useEffect(() => {
    const root = document.documentElement;
    
    if (isNightMode) {
      root.style.setProperty('--night-mode-filter', `brightness(${brightness}%) contrast(${100 + contrastBoost}%)`);
      root.classList.add('night-mode-active');
    } else {
      root.style.removeProperty('--night-mode-filter');
      root.classList.remove('night-mode-active');
    }

    return () => {
      root.style.removeProperty('--night-mode-filter');
      root.classList.remove('night-mode-active');
    };
  }, [isNightMode, brightness, contrastBoost]);

  return (
    <Card className={cn(
      "bg-card border-border transition-all duration-300",
      isNightMode && "border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono flex items-center gap-2">
          {isNightMode ? (
            <Moon className="h-4 w-4 text-primary" />
          ) : (
            <Sun className="h-4 w-4 text-warning" />
          )}
          Night Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-mono">Night Mode</Label>
          </div>
          <Switch
            checked={isNightMode}
            onCheckedChange={setIsNightMode}
          />
        </div>

        {/* Auto Mode */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs font-mono">Auto Night Mode</Label>
            <p className="text-[10px] text-muted-foreground">Enable after 7 PM</p>
          </div>
          <Switch
            checked={autoNightMode}
            onCheckedChange={setAutoNightMode}
          />
        </div>

        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-mono">Screen Brightness</Label>
            <span className="text-xs text-muted-foreground font-mono">{brightness}%</span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={([value]) => setBrightness(value)}
            min={30}
            max={100}
            step={5}
            disabled={!isNightMode}
            className="w-full"
          />
        </div>

        {/* Contrast Boost */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs font-mono">Contrast Boost</Label>
            <span className="text-xs text-muted-foreground font-mono">+{contrastBoost}%</span>
          </div>
          <Slider
            value={[contrastBoost]}
            onValueChange={([value]) => setContrastBoost(value)}
            min={0}
            max={50}
            step={5}
            disabled={!isNightMode}
            className="w-full"
          />
        </div>

        {/* Status Indicator */}
        <div className={cn(
          "flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-mono",
          isNightMode ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {isNightMode ? (
            <>
              <Moon className="h-3 w-3" />
              Night mode active - reduced eye strain
            </>
          ) : (
            <>
              <Sun className="h-3 w-3" />
              Day mode - normal visibility
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NightModeController;
