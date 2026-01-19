import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NetworkStatusIndicatorProps {
  connected: boolean;
  connectionType: string;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  isWifi: boolean;
  isCellular: boolean;
  compact?: boolean;
}

const NetworkStatusIndicator = ({
  connected,
  connectionType,
  connectionQuality,
  isWifi,
  isCellular,
  compact = false,
}: NetworkStatusIndicatorProps) => {
  const getQualityIcon = () => {
    if (!connected) return <WifiOff className="h-4 w-4" />;
    if (isWifi) return <Wifi className="h-4 w-4" />;
    
    switch (connectionQuality) {
      case 'excellent':
        return <SignalHigh className="h-4 w-4" />;
      case 'good':
        return <SignalMedium className="h-4 w-4" />;
      case 'fair':
        return <SignalLow className="h-4 w-4" />;
      default:
        return <Signal className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    if (!connected) return 'text-danger bg-danger/10 border-danger/30';
    switch (connectionQuality) {
      case 'excellent':
        return 'text-safe bg-safe/10 border-safe/30';
      case 'good':
        return 'text-safe bg-safe/10 border-safe/30';
      case 'fair':
        return 'text-warning bg-warning/10 border-warning/30';
      case 'poor':
        return 'text-danger bg-danger/10 border-danger/30';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusText = () => {
    if (!connected) return 'Offline';
    if (isWifi) return 'WiFi';
    if (isCellular) return 'Cellular';
    return connectionType || 'Connected';
  };

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-mono",
        getStatusColor()
      )}>
        {getQualityIcon()}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border font-mono text-sm",
      getStatusColor()
    )}>
      {getQualityIcon()}
      <span>{getStatusText()}</span>
      {connected && (
        <span className="text-[10px] opacity-70 uppercase">
          {connectionQuality}
        </span>
      )}
    </div>
  );
};

export default NetworkStatusIndicator;
