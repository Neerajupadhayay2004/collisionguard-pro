import { Wifi, WifiOff, Database, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OfflineModeIndicatorProps {
  isOffline: boolean;
  cachedRoutesCount: number;
  cacheSize: number;
  onClearCache: () => void;
}

const OfflineModeIndicator = ({
  isOffline,
  cachedRoutesCount,
  cacheSize,
  onClearCache,
}: OfflineModeIndicatorProps) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all duration-300",
      isOffline 
        ? "border-warning bg-warning/10" 
        : "border-border bg-card"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOffline ? (
            <WifiOff className="h-5 w-5 text-warning" />
          ) : (
            <Wifi className="h-5 w-5 text-safe" />
          )}
          <div>
            <p className="text-sm font-mono font-medium">
              {isOffline ? 'Offline Mode' : 'Online'}
            </p>
            <p className="text-xs text-muted-foreground">
              {cachedRoutesCount} routes cached
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Database className="h-3 w-3" />
            <span>{formatBytes(cacheSize)}</span>
          </div>
          
          {cacheSize > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCache}
              className="h-7 w-7 p-0"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-danger" />
            </Button>
          )}
        </div>
      </div>

      {isOffline && (
        <div className="mt-2 pt-2 border-t border-warning/20">
          <p className="text-xs text-warning font-mono">
            Using cached maps and routes. Some features may be limited.
          </p>
        </div>
      )}
    </div>
  );
};

export default OfflineModeIndicator;
