import { Gauge, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpeedLimitAlertProps {
  currentSpeed: number;
  speedLimit: number;
  isOverLimit: boolean;
  overLimitAmount: number;
  roadType: string;
}

const SpeedLimitAlert = ({
  currentSpeed,
  speedLimit,
  isOverLimit,
  overLimitAmount,
  roadType,
}: SpeedLimitAlertProps) => {
  const getSpeedColor = () => {
    if (!isOverLimit) return 'text-safe';
    if (overLimitAmount > 20) return 'text-danger';
    return 'text-warning';
  };

  const getBorderColor = () => {
    if (!isOverLimit) return 'border-safe/50';
    if (overLimitAmount > 20) return 'border-danger';
    return 'border-warning';
  };

  const getBackgroundColor = () => {
    if (!isOverLimit) return 'bg-safe/10';
    if (overLimitAmount > 20) return 'bg-danger/20';
    return 'bg-warning/20';
  };

  return (
    <div 
      className={cn(
        "rounded-lg border-2 p-4 transition-all duration-300",
        getBorderColor(),
        getBackgroundColor(),
        isOverLimit && "animate-pulse"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            isOverLimit ? "bg-danger/20" : "bg-safe/20"
          )}>
            {isOverLimit ? (
              <AlertTriangle className="h-6 w-6 text-danger" />
            ) : (
              <Gauge className="h-6 w-6 text-safe" />
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Speed Limit
            </p>
            <p className="text-lg font-bold font-mono">
              {speedLimit} <span className="text-sm text-muted-foreground">km/h</span>
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
            Current
          </p>
          <p className={cn("text-2xl font-bold font-mono", getSpeedColor())}>
            {currentSpeed.toFixed(0)}
            <span className="text-sm text-muted-foreground ml-1">km/h</span>
          </p>
        </div>
      </div>

      {isOverLimit && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-danger font-mono">
              ⚠️ {overLimitAmount.toFixed(0)} km/h over limit
            </span>
            <span className="text-xs text-muted-foreground font-mono capitalize">
              {roadType} road
            </span>
          </div>
        </div>
      )}

      {!isOverLimit && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground font-mono capitalize">
            {roadType} road
          </p>
        </div>
      )}
    </div>
  );
};

export default SpeedLimitAlert;
