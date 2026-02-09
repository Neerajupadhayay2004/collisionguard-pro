import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Shield, AlertTriangle, Car, Eye, Gauge, Cloud, Brain, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollisionWarning {
  id: string;
  vehicleId: string;
  distance: number;
  relativeSpeed: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}

interface UnifiedCollisionRiskProps {
  currentSpeed: number;
  nearbyVehicles: number;
  collisionWarnings: CollisionWarning[];
  isRideActive: boolean;
  fatigueLevel?: number;
  isOverSpeedLimit?: boolean;
  weatherCondition?: string;
  visibility?: number;
}

const UnifiedCollisionRisk = ({
  currentSpeed,
  nearbyVehicles,
  collisionWarnings,
  isRideActive,
  fatigueLevel = 0,
  isOverSpeedLimit = false,
  weatherCondition = 'clear',
  visibility = 10,
}: UnifiedCollisionRiskProps) => {

  const riskAnalysis = useMemo(() => {
    let totalRisk = 0;
    const factors: { name: string; risk: number; icon: any; detail: string }[] = [];

    // Speed risk
    const speedRisk = currentSpeed > 120 ? 90 : currentSpeed > 80 ? 60 : currentSpeed > 50 ? 30 : 10;
    factors.push({ name: 'Speed', risk: speedRisk, icon: Gauge, detail: `${currentSpeed.toFixed(0)} km/h` });
    totalRisk += speedRisk * 0.2;

    // Proximity risk
    const criticalWarnings = collisionWarnings.filter(w => w.severity === 'critical' || w.severity === 'high').length;
    const proximityRisk = criticalWarnings > 0 ? 95 : nearbyVehicles > 3 ? 70 : nearbyVehicles > 0 ? 40 : 5;
    factors.push({ name: 'Proximity', risk: proximityRisk, icon: Car, detail: `${nearbyVehicles} nearby` });
    totalRisk += proximityRisk * 0.3;

    // Fatigue risk
    const fatigueRisk = fatigueLevel > 60 ? 90 : fatigueLevel > 30 ? 50 : 10;
    factors.push({ name: 'Fatigue', risk: fatigueRisk, icon: Eye, detail: `${fatigueLevel.toFixed(0)}%` });
    totalRisk += fatigueRisk * 0.15;

    // Speed limit risk
    const limitRisk = isOverSpeedLimit ? 80 : 5;
    factors.push({ name: 'Speed Limit', risk: limitRisk, icon: AlertTriangle, detail: isOverSpeedLimit ? 'Over' : 'OK' });
    totalRisk += limitRisk * 0.15;

    // Weather risk
    const badWeather = ['rain', 'snow', 'fog', 'storm'].includes(weatherCondition.toLowerCase());
    const weatherRisk = badWeather ? 70 : visibility < 5 ? 60 : 10;
    factors.push({ name: 'Weather', risk: weatherRisk, icon: Cloud, detail: weatherCondition });
    totalRisk += weatherRisk * 0.1;

    // Awareness (connected systems)
    const awarenessRisk = 10;
    factors.push({ name: 'Systems', risk: 100 - awarenessRisk, icon: Radio, detail: 'Active' });
    totalRisk += awarenessRisk * 0.1;

    return { totalRisk: Math.min(100, totalRisk), factors };
  }, [currentSpeed, nearbyVehicles, collisionWarnings, fatigueLevel, isOverSpeedLimit, weatherCondition, visibility]);

  const getRiskLevel = (risk: number) => {
    if (risk < 25) return { label: 'LOW', color: 'text-safe', bg: 'bg-safe', glow: 'shadow-[0_0_15px_hsl(var(--safe)/0.4)]' };
    if (risk < 50) return { label: 'MODERATE', color: 'text-warning', bg: 'bg-warning', glow: 'shadow-[0_0_15px_hsl(var(--warning)/0.4)]' };
    if (risk < 75) return { label: 'HIGH', color: 'text-danger', bg: 'bg-danger', glow: 'shadow-[0_0_15px_hsl(var(--danger)/0.4)]' };
    return { label: 'CRITICAL', color: 'text-danger', bg: 'bg-danger animate-pulse', glow: 'shadow-[0_0_25px_hsl(var(--danger)/0.6)]' };
  };

  const riskLevel = getRiskLevel(riskAnalysis.totalRisk);

  if (!isRideActive) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-6 text-center text-muted-foreground text-sm font-mono">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          Start a ride to see collision risk analysis
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-card border-border transition-shadow", riskLevel.glow)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Unified Collision Risk
          </div>
          <span className={cn("text-xs font-bold px-2 py-1 rounded-full", riskLevel.bg, "text-white")}>
            {riskLevel.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Risk Gauge */}
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke={riskAnalysis.totalRisk < 25 ? 'hsl(var(--safe))' : riskAnalysis.totalRisk < 50 ? 'hsl(var(--warning))' : 'hsl(var(--danger))'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${riskAnalysis.totalRisk * 2.64} 264`}
                className="transition-all duration-700"
              />
            </svg>
            <span className={cn("absolute text-2xl font-bold font-mono", riskLevel.color)}>
              {riskAnalysis.totalRisk.toFixed(0)}
            </span>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="space-y-2">
          {riskAnalysis.factors.map((factor) => {
            const Icon = factor.icon;
            const fLevel = getRiskLevel(factor.risk);
            return (
              <div key={factor.name} className="flex items-center gap-2">
                <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] font-mono text-muted-foreground w-16">{factor.name}</span>
                <div className="flex-1">
                  <Progress value={factor.risk} className="h-1.5" />
                </div>
                <span className={cn("text-[10px] font-mono font-bold w-12 text-right", fLevel.color)}>
                  {factor.detail}
                </span>
              </div>
            );
          })}
        </div>

        {/* Active Warnings */}
        {collisionWarnings.length > 0 && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-2 space-y-1">
            <p className="text-[10px] font-mono text-danger font-bold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {collisionWarnings.length} Active Warning{collisionWarnings.length > 1 ? 's' : ''}
            </p>
            {collisionWarnings.slice(0, 3).map((w) => (
              <p key={w.id} className="text-[10px] font-mono text-danger/80">
                Vehicle {w.distance.toFixed(0)}m • {w.relativeSpeed.toFixed(0)}km/h • {w.severity.toUpperCase()}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedCollisionRisk;
