import MotionSensorDisplay from '@/components/MotionSensorDisplay';
import DriverFatigueDetector from '@/components/DriverFatigueDetector';
import NightModeController from '@/components/NightModeController';
import AccidentHeatmap from '@/components/AccidentHeatmap';
import NotificationManager from '@/components/NotificationManager';
import DeviceStatus from '@/components/DeviceStatus';
import SafeRouteAI from '@/components/SafeRouteAI';
import DemoDataButton from '@/components/DemoDataButton';
import { useNativeSpeech } from '@/hooks/useNativeSpeech';

const Features = () => {
  const { speak: nativeSpeak } = useNativeSpeech();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-bold font-mono gradient-text mb-2">Safety Features</h1>
        <p className="text-muted-foreground text-sm md:text-base">All AI-powered safety tools at your fingertips</p>
      </div>

      <div className="flex justify-end mb-6">
        <DemoDataButton />
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-8">
        <MotionSensorDisplay
          isRideActive={false}
          onCollisionDetected={() => {}}
          onSpeak={nativeSpeak}
        />
        <DriverFatigueDetector isRideActive={false} onSpeak={nativeSpeak} />
        <NightModeController isRideActive={false} />
        <AccidentHeatmap currentLocation={null} />
        <NotificationManager isRideActive={false} />
        <DeviceStatus onBatteryLow={() => nativeSpeak('Warning. Battery is low.')} />
      </div>

      {/* Safe Route */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <SafeRouteAI currentLocation={null} />
      </div>
    </div>
  );
};

export default Features;
