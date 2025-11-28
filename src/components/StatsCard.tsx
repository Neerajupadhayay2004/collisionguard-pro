import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  severity?: 'safe' | 'warning' | 'danger';
}

const StatsCard = ({ title, value, icon: Icon, trend, severity = 'safe' }: StatsCardProps) => {
  const severityStyles = {
    safe: 'border-safe/50 bg-safe/5',
    warning: 'border-warning/50 bg-warning/5',
    danger: 'border-danger/50 bg-danger/5',
  };

  const glowStyles = {
    safe: { boxShadow: 'var(--glow-safe)' },
    warning: { boxShadow: 'var(--glow-warning)' },
    danger: { boxShadow: 'var(--glow-danger)' },
  };

  return (
    <Card className={`p-6 ${severityStyles[severity]} border-2 transition-all hover:scale-[1.02]`} style={glowStyles[severity]}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-mono mb-2">{title}</p>
          <p className="text-3xl font-bold font-mono">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 font-mono ${trend.isPositive ? 'text-safe' : 'text-danger'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${severity}/20`}>
          <Icon className={`h-6 w-6 text-${severity}`} />
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;
