import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Volume2, Wifi, RotateCcw, Save, AlertTriangle, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useSettings, AppSettings } from '@/hooks/useSettings';

const Settings = () => {
  const { settings, saveSettings, resetSettings, isLoaded } = useSettings();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setLocalSettings(settings);
    }
  }, [isLoaded, settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(localSettings);
    setHasChanges(false);
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    resetSettings();
    setLocalSettings(settings);
    setHasChanges(false);
    toast.info('Settings reset to defaults');
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-bold font-mono gradient-text mb-2">Settings</h1>
        <p className="text-muted-foreground text-sm md:text-base">Customize your experience</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Alert Thresholds */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alert Thresholds
            </CardTitle>
            <CardDescription>Configure when warnings are triggered</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-mono text-sm">Collision Warning Distance</Label>
                <span className="text-sm text-muted-foreground font-mono">
                  {localSettings.collisionWarningDistance}m
                </span>
              </div>
              <Slider
                value={[localSettings.collisionWarningDistance]}
                onValueChange={([value]) => updateSetting('collisionWarningDistance', value)}
                min={50}
                max={200}
                step={10}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Distance at which collision warnings are triggered
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-mono text-sm">Critical Warning Distance</Label>
                <span className="text-sm text-muted-foreground font-mono">
                  {localSettings.criticalWarningDistance}m
                </span>
              </div>
              <Slider
                value={[localSettings.criticalWarningDistance]}
                onValueChange={([value]) => updateSetting('criticalWarningDistance', value)}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Distance at which critical alerts are triggered
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-mono text-sm">Speed Alert Threshold</Label>
                <span className="text-sm text-muted-foreground font-mono">
                  +{localSettings.speedAlertThreshold} km/h
                </span>
              </div>
              <Slider
                value={[localSettings.speedAlertThreshold]}
                onValueChange={([value]) => updateSetting('speedAlertThreshold', value)}
                min={0}
                max={30}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Trigger alert when exceeding speed limit by this amount
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sound Preferences */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono">
              <Volume2 className="h-5 w-5 text-primary" />
              Sound Preferences
            </CardTitle>
            <CardDescription>Control audio alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-mono text-sm">Enable Sound</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Play audio alerts for warnings
                </p>
              </div>
              <Switch
                checked={localSettings.soundEnabled}
                onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-mono text-sm">Alert Volume</Label>
                <span className="text-sm text-muted-foreground font-mono">
                  {localSettings.alertVolume}%
                </span>
              </div>
              <Slider
                value={[localSettings.alertVolume]}
                onValueChange={([value]) => updateSetting('alertVolume', value)}
                min={0}
                max={100}
                step={10}
                disabled={!localSettings.soundEnabled}
                className="w-full"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-mono text-sm">Voice Alerts</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Spoken announcements for warnings
                </p>
              </div>
              <Switch
                checked={localSettings.voiceAlertsEnabled}
                onCheckedChange={(checked) => updateSetting('voiceAlertsEnabled', checked)}
                disabled={!localSettings.soundEnabled}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="font-mono text-sm">Alert Tone</Label>
              <Select
                value={localSettings.alertTone}
                onValueChange={(value) => updateSetting('alertTone', value as AppSettings['alertTone'])}
                disabled={!localSettings.soundEnabled}
              >
                <SelectTrigger className="w-full bg-secondary border-border">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="soft">Soft</SelectItem>
                  <SelectItem value="beep">Beep</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Offline Cache */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono">
              <Wifi className="h-5 w-5 text-safe" />
              Offline Cache
            </CardTitle>
            <CardDescription>Manage offline storage for maps and routes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-mono text-sm">Maximum Cache Size</Label>
                <span className="text-sm text-muted-foreground font-mono">
                  {localSettings.maxCacheSize} MB
                </span>
              </div>
              <Slider
                value={[localSettings.maxCacheSize]}
                onValueChange={([value]) => updateSetting('maxCacheSize', value)}
                min={50}
                max={500}
                step={50}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum storage for offline maps and routes
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-mono text-sm">Auto-cache Routes</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically save calculated routes
                </p>
              </div>
              <Switch
                checked={localSettings.autoCacheRoutes}
                onCheckedChange={(checked) => updateSetting('autoCacheRoutes', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-mono text-sm">Cache Map Tiles</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Store map tiles for offline viewing
                </p>
              </div>
              <Switch
                checked={localSettings.cacheMapTiles}
                onCheckedChange={(checked) => updateSetting('cacheMapTiles', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-mono text-sm">Cache Duration</Label>
                <span className="text-sm text-muted-foreground font-mono">
                  {localSettings.cacheDuration} days
                </span>
              </div>
              <Slider
                value={[localSettings.cacheDuration]}
                onValueChange={([value]) => updateSetting('cacheDuration', value)}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                How long to keep cached data before auto-clearing
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pb-6">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1 border-border hover:bg-secondary"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
