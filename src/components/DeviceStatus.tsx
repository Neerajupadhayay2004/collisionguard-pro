import { useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { 
  Smartphone, 
  Battery, 
  BatteryCharging, 
  BatteryLow,
  HardDrive,
  Cpu,
  RefreshCw,
  Globe
} from 'lucide-react';
import { useDeviceInfo } from '@/hooks/useDeviceInfo';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeviceStatusProps {
  onBatteryLow?: () => void;
}

const DeviceStatus = ({ onBatteryLow }: DeviceStatusProps) => {
  const {
    batteryPercentage,
    isCharging,
    isBatteryLow,
    platform,
    isNative,
    model,
    osVersion,
    manufacturer,
    memoryUsed,
    diskFree,
    diskTotal,
    formatBytes,
    refresh,
    isLoading,
  } = useDeviceInfo();

  // Alert on low battery
  useEffect(() => {
    if (isBatteryLow) {
      toast.warning('Battery Low', {
        description: `Battery at ${batteryPercentage}%. Consider charging soon.`,
      });
      onBatteryLow?.();
    }
  }, [isBatteryLow, batteryPercentage, onBatteryLow]);

  const getBatteryColor = () => {
    if (isCharging) return 'text-safe';
    if (batteryPercentage <= 20) return 'text-danger';
    if (batteryPercentage <= 50) return 'text-warning';
    return 'text-safe';
  };

  const getBatteryIcon = () => {
    if (isCharging) return BatteryCharging;
    if (batteryPercentage <= 20) return BatteryLow;
    return Battery;
  };

  const BatteryIcon = getBatteryIcon();

  const diskUsagePercent = diskTotal && diskFree 
    ? Math.round(((diskTotal - diskFree) / diskTotal) * 100)
    : 0;

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="font-bold font-mono text-sm">Device Status</h3>
            {isNative && (
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                NATIVE
              </span>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="space-y-3">
          {/* Battery Status */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BatteryIcon className={cn("h-5 w-5", getBatteryColor())} />
                <span className="text-xs font-mono text-muted-foreground">Battery</span>
              </div>
              <span className={cn("text-lg font-bold font-mono", getBatteryColor())}>
                {batteryPercentage}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  isCharging ? 'bg-safe animate-pulse' :
                  batteryPercentage <= 20 ? 'bg-danger' :
                  batteryPercentage <= 50 ? 'bg-warning' : 'bg-safe'
                )}
                style={{ width: `${batteryPercentage}%` }}
              />
            </div>
            {isCharging && (
              <p className="text-[10px] text-safe mt-1 font-mono">⚡ Charging</p>
            )}
          </div>

          {/* Device Info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/30 p-2 rounded">
              <p className="text-[10px] text-muted-foreground font-mono">Platform</p>
              <p className="text-xs font-medium capitalize">{platform}</p>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <p className="text-[10px] text-muted-foreground font-mono">OS Version</p>
              <p className="text-xs font-medium">{osVersion}</p>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <p className="text-[10px] text-muted-foreground font-mono">Model</p>
              <p className="text-xs font-medium truncate">{model}</p>
            </div>
            <div className="bg-muted/30 p-2 rounded">
              <p className="text-[10px] text-muted-foreground font-mono">Manufacturer</p>
              <p className="text-xs font-medium truncate">{manufacturer}</p>
            </div>
          </div>

          {/* Storage & Memory */}
          <div className="space-y-2">
            {/* Memory */}
            {memoryUsed !== null && (
              <div className="flex items-center gap-2 text-xs">
                <Cpu className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground font-mono">Memory:</span>
                <span className="font-medium">{formatBytes(memoryUsed)}</span>
              </div>
            )}
            
            {/* Disk */}
            {diskTotal !== null && diskFree !== null && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <HardDrive className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground font-mono">Storage:</span>
                  <span className="font-medium">
                    {formatBytes(diskTotal - diskFree)} / {formatBytes(diskTotal)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      diskUsagePercent >= 90 ? 'bg-danger' :
                      diskUsagePercent >= 70 ? 'bg-warning' : 'bg-primary'
                    )}
                    style={{ width: `${diskUsagePercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DeviceStatus;
