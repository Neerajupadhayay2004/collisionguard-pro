import { Bluetooth, BluetoothSearching, Signal, Gauge, Thermometer, Battery, Fuel, Unplug } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBluetooth } from '@/hooks/useBluetooth';
import { cn } from '@/lib/utils';

interface BluetoothPanelProps {
  onSpeedUpdate?: (speed: number) => void;
}

const BluetoothPanel = ({ onSpeedUpdate }: BluetoothPanelProps) => {
  const {
    isSupported,
    isScanning,
    connectedDevices,
    obd2Data,
    btSpeed,
    scanDevices,
    disconnectAll,
  } = useBluetooth();

  // Forward BT speed to parent
  if (onSpeedUpdate && btSpeed > 0) {
    onSpeedUpdate(btSpeed);
  }

  if (!isSupported) {
    return (
      <Card className="p-4 border-border bg-card">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bluetooth className="h-5 w-5" />
          <span className="text-sm font-mono">Bluetooth not available</span>
        </div>
      </Card>
    );
  }

  const connectedCount = connectedDevices.filter(d => d.connected).length;

  return (
    <Card className="p-4 border-border bg-card">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold font-mono flex items-center gap-2 text-foreground">
            <Bluetooth className="h-4 w-4 text-primary" />
            Bluetooth Devices
          </h3>
          <div className={cn(
            "px-2 py-0.5 rounded-full text-xs font-mono",
            connectedCount > 0 ? "bg-safe/20 text-safe" : "bg-muted text-muted-foreground"
          )}>
            {connectedCount} connected
          </div>
        </div>

        {/* Scan Button */}
        <Button
          onClick={scanDevices}
          disabled={isScanning}
          variant="outline"
          size="sm"
          className="w-full font-mono"
        >
          {isScanning ? (
            <>
              <BluetoothSearching className="mr-2 h-4 w-4 animate-pulse" />
              Scanning...
            </>
          ) : (
            <>
              <Bluetooth className="mr-2 h-4 w-4" />
              Scan for Devices
            </>
          )}
        </Button>

        {/* Connected Devices */}
        {connectedDevices.length > 0 && (
          <div className="space-y-2">
            {connectedDevices.map((device) => (
              <div
                key={device.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border text-sm",
                  device.connected
                    ? "border-safe/30 bg-safe/5"
                    : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <Signal className={cn("h-4 w-4", device.connected ? "text-safe" : "text-muted-foreground")} />
                  <div>
                    <p className="font-mono text-xs font-medium text-foreground">{device.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{device.type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  device.connected ? "bg-safe animate-pulse" : "bg-muted-foreground/30"
                )} />
              </div>
            ))}
          </div>
        )}

        {/* OBD2 Data */}
        {obd2Data && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/50 p-2 rounded-lg">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Gauge className="h-3 w-3" />
                <span className="text-xs font-mono">Speed</span>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">{obd2Data.speed} km/h</p>
            </div>
            <div className="bg-muted/50 p-2 rounded-lg">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Signal className="h-3 w-3" />
                <span className="text-xs font-mono">RPM</span>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">{obd2Data.rpm}</p>
            </div>
            <div className="bg-muted/50 p-2 rounded-lg">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Thermometer className="h-3 w-3" />
                <span className="text-xs font-mono">Engine</span>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">{obd2Data.engineTemp}°C</p>
            </div>
            <div className="bg-muted/50 p-2 rounded-lg">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Battery className="h-3 w-3" />
                <span className="text-xs font-mono">Battery</span>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">{obd2Data.batteryVoltage}V</p>
            </div>
          </div>
        )}

        {/* BT Speed (without OBD2) */}
        {!obd2Data && btSpeed > 0 && (
          <div className="bg-primary/10 p-3 rounded-lg text-center">
            <p className="text-xs text-muted-foreground font-mono mb-1">BT Sensor Speed</p>
            <p className="text-2xl font-bold font-mono text-primary">{btSpeed.toFixed(0)} km/h</p>
          </div>
        )}

        {/* Disconnect */}
        {connectedCount > 0 && (
          <Button
            onClick={disconnectAll}
            variant="ghost"
            size="sm"
            className="w-full font-mono text-danger hover:text-danger"
          >
            <Unplug className="mr-2 h-4 w-4" />
            Disconnect All
          </Button>
        )}
      </div>
    </Card>
  );
};

export default BluetoothPanel;
