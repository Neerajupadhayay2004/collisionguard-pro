import { useEffect, useRef, useState, useCallback } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Camera, 
  CameraOff, 
  Gauge, 
  AlertTriangle, 
  Car, 
  Bike, 
  Truck,
  Eye,
  EyeOff,
  Settings2,
  Maximize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { toast } from 'sonner';
import { useNativeCamera } from '@/hooks/useNativeCamera';
import { cn } from '@/lib/utils';

interface Detection {
  id: string;
  class: string;
  score: number;
  bbox: [number, number, number, number];
  speed: number;
  distance: number;
  riskLevel: 'safe' | 'warning' | 'danger';
  trackingId: string;
}

interface AdvancedCameraDetectionProps {
  onSpeedDetected: (speed: number) => void;
  onCollisionRisk?: (risk: number, nearestVehicle: Detection | null) => void;
  isRideActive: boolean;
  onSpeak?: (message: string) => void;
}

// Vehicle tracking with Kalman-like smoothing
interface TrackedVehicle {
  id: string;
  class: string;
  positions: { x: number; y: number; width: number; height: number; timestamp: number }[];
  smoothedSpeed: number;
  estimatedDistance: number;
  lastSeen: number;
}

const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
const FOCAL_LENGTH = 800; // Approximate focal length for distance calculation
const AVERAGE_CAR_WIDTH = 1.8; // meters

const AdvancedCameraDetection = ({ 
  onSpeedDetected, 
  onCollisionRisk,
  isRideActive,
  onSpeak 
}: AdvancedCameraDetectionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [collisionRisk, setCollisionRisk] = useState(0);
  const [fps, setFps] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.5);
  const [showOverlay, setShowOverlay] = useState(true);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const trackedVehiclesRef = useRef<Map<string, TrackedVehicle>>(new Map());
  const animationFrameRef = useRef<number>();
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });
  const lastAlertTimeRef = useRef(0);
  
  const { 
    startStream, 
    stopStream, 
    isNative,
    checkPermissions,
  } = useNativeCamera({
    width: 1920,
    height: 1080,
  });

  // Load model on mount
  useEffect(() => {
    loadModel();
    return () => {
      stopCamera();
    };
  }, []);

  const loadModel = async () => {
    try {
      setModelLoading(true);
      setLoadingProgress(10);
      
      console.log('Loading COCO-SSD model with enhanced settings...');
      setLoadingProgress(30);
      
      // Load with higher accuracy settings
      const loadedModel = await cocoSsd.load({
        base: 'mobilenet_v2', // More accurate than lite_mobilenet_v2
      });
      
      setLoadingProgress(90);
      setModel(loadedModel);
      setLoadingProgress(100);
      
      console.log('Model loaded successfully with mobilenet_v2');
      toast.success('AI Detection Ready', {
        description: 'Enhanced vehicle detection model loaded',
      });
    } catch (error) {
      console.error('Error loading model:', error);
      toast.error('Failed to load detection model');
    } finally {
      setModelLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const hasPerms = await checkPermissions();
      if (!hasPerms) {
        toast.error('Camera permission required');
        return;
      }

      if (!videoRef.current) return;

      const stream = await startStream(videoRef.current, 'environment');
      
      if (stream) {
        setIsActive(true);
        toast.success(isNative ? 'Native camera started' : 'Camera started', {
          description: 'Vehicle detection active',
        });
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            if (overlayCanvasRef.current) {
              overlayCanvasRef.current.width = videoRef.current.videoWidth;
              overlayCanvasRef.current.height = videoRef.current.videoHeight;
            }
          }
          detectObjects();
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopCamera = () => {
    stopStream();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsActive(false);
    setDetections([]);
    setCollisionRisk(0);
    trackedVehiclesRef.current.clear();
  };

  // Calculate distance using apparent size
  const calculateDistance = useCallback((bboxWidth: number, vehicleClass: string): number => {
    // Estimate real width based on vehicle class
    let realWidth = AVERAGE_CAR_WIDTH;
    if (vehicleClass === 'truck' || vehicleClass === 'bus') realWidth = 2.5;
    if (vehicleClass === 'motorcycle' || vehicleClass === 'bicycle') realWidth = 0.8;
    
    // Distance = (real width × focal length) / pixel width
    const distance = (realWidth * FOCAL_LENGTH) / bboxWidth;
    return Math.max(1, Math.min(100, distance)); // Clamp between 1-100 meters
  }, []);

  // Calculate speed using position tracking
  const calculateSpeed = useCallback((
    vehicle: TrackedVehicle,
    currentPos: { x: number; y: number; width: number; height: number },
    timestamp: number
  ): number => {
    if (vehicle.positions.length < 2) return 0;
    
    const lastPos = vehicle.positions[vehicle.positions.length - 1];
    const timeDelta = (timestamp - lastPos.timestamp) / 1000; // seconds
    
    if (timeDelta <= 0) return vehicle.smoothedSpeed;
    
    // Calculate pixel movement
    const dx = currentPos.x - lastPos.x;
    const dy = currentPos.y - lastPos.y;
    const pixelDistance = Math.sqrt(dx * dx + dy * dy);
    
    // Convert to real-world speed (rough estimation)
    // Using perspective: closer objects move more pixels
    const distance = calculateDistance(currentPos.width, vehicle.class);
    const scaleFactor = distance / 10; // Normalize by distance
    
    const rawSpeed = (pixelDistance * scaleFactor) / timeDelta * 0.36; // Convert to km/h
    
    // Smooth the speed with exponential moving average
    const alpha = 0.3;
    const smoothedSpeed = alpha * rawSpeed + (1 - alpha) * vehicle.smoothedSpeed;
    
    return Math.min(smoothedSpeed, 200); // Cap at 200 km/h
  }, [calculateDistance]);

  // Determine risk level
  const calculateRiskLevel = useCallback((distance: number, speed: number): 'safe' | 'warning' | 'danger' => {
    // Time to collision estimation
    const ttc = distance / (Math.max(speed, 1) / 3.6); // Convert km/h to m/s
    
    if (ttc < 2 || distance < 5) return 'danger';
    if (ttc < 5 || distance < 15) return 'warning';
    return 'safe';
  }, []);

  // Generate tracking ID from detection
  const generateTrackingId = useCallback((bbox: number[], className: string): string => {
    const centerX = Math.round(bbox[0] / 50);
    const centerY = Math.round(bbox[1] / 50);
    return `${className}-${centerX}-${centerY}`;
  }, []);

  const detectObjects = async () => {
    if (!model || !videoRef.current || !canvasRef.current) {
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(detectObjects);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(detectObjects);
      return;
    }

    try {
      const now = Date.now();
      
      // FPS calculation
      fpsCounterRef.current.frames++;
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.frames);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }

      // Run detection
      const predictions = await model.detect(video, 20, sensitivity);

      // Clear and draw video
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const newDetections: Detection[] = [];
      let maxRisk = 0;
      let nearestVehicle: Detection | null = null;
      let minDistance = Infinity;

      // Process predictions
      for (const prediction of predictions) {
        if (!VEHICLE_CLASSES.includes(prediction.class)) continue;
        
        const [x, y, width, height] = prediction.bbox;
        const trackingId = generateTrackingId(prediction.bbox, prediction.class);
        
        // Get or create tracked vehicle
        let tracked = trackedVehiclesRef.current.get(trackingId);
        if (!tracked) {
          tracked = {
            id: trackingId,
            class: prediction.class,
            positions: [],
            smoothedSpeed: 0,
            estimatedDistance: 50,
            lastSeen: now,
          };
          trackedVehiclesRef.current.set(trackingId, tracked);
        }

        // Update tracking
        const currentPos = { x, y, width, height, timestamp: now };
        const speed = calculateSpeed(tracked, currentPos, now);
        const distance = calculateDistance(width, prediction.class);
        const riskLevel = isRideActive ? calculateRiskLevel(distance, speed) : 'safe';
        
        // Update tracked vehicle
        tracked.positions.push(currentPos);
        if (tracked.positions.length > 10) tracked.positions.shift();
        tracked.smoothedSpeed = speed;
        tracked.estimatedDistance = distance;
        tracked.lastSeen = now;

        const detection: Detection = {
          id: `${trackingId}-${now}`,
          class: prediction.class,
          score: prediction.score,
          bbox: prediction.bbox as [number, number, number, number],
          speed,
          distance,
          riskLevel,
          trackingId,
        };

        newDetections.push(detection);

        // Track nearest and highest risk
        if (distance < minDistance) {
          minDistance = distance;
          nearestVehicle = detection;
        }
        
        const riskScore = riskLevel === 'danger' ? 1 : riskLevel === 'warning' ? 0.6 : 0.2;
        maxRisk = Math.max(maxRisk, riskScore);

        // Draw bounding box
        if (showOverlay) {
          const color = riskLevel === 'danger' ? '#ef4444' : 
                       riskLevel === 'warning' ? '#f59e0b' : '#10b981';
          
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);

          // Draw background for label
          const labelHeight = 28;
          ctx.fillStyle = color;
          ctx.fillRect(x, y - labelHeight, width, labelHeight);
          
          // Draw label text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px monospace';
          ctx.fillText(
            `${prediction.class.toUpperCase()} ${distance.toFixed(0)}m`,
            x + 5,
            y - 10
          );

          // Speed indicator if moving
          if (speed > 5) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(x, y + height, width, 24);
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.fillText(`${speed.toFixed(0)} km/h`, x + 5, y + height + 16);
          }

          // Risk indicator for danger
          if (riskLevel === 'danger') {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
            ctx.setLineDash([]);
          }
        }
      }

      // Clean up old tracked vehicles
      trackedVehiclesRef.current.forEach((vehicle, id) => {
        if (now - vehicle.lastSeen > 2000) {
          trackedVehiclesRef.current.delete(id);
        }
      });

      // Update state
      setDetections(newDetections);
      
      if (isRideActive) {
        const riskPercent = maxRisk * 100;
        setCollisionRisk(riskPercent);
        onCollisionRisk?.(riskPercent, nearestVehicle);

        // Send max detected speed
        const maxSpeed = newDetections.reduce((max, d) => Math.max(max, d.speed), 0);
        if (maxSpeed > 0) {
          onSpeedDetected(maxSpeed);
        }

        // Audio alert for danger
        if (audioAlerts && maxRisk >= 0.8 && now - lastAlertTimeRef.current > 3000) {
          lastAlertTimeRef.current = now;
          onSpeak?.(`Warning! Vehicle detected ${minDistance.toFixed(0)} meters ahead`);
        }
      }

    } catch (error) {
      console.error('Detection error:', error);
    }

    animationFrameRef.current = requestAnimationFrame(detectObjects);
  };

  const getVehicleIcon = (vehicleClass: string) => {
    switch (vehicleClass) {
      case 'car': return <Car className="h-3 w-3" />;
      case 'truck':
      case 'bus': return <Truck className="h-3 w-3" />;
      case 'motorcycle':
      case 'bicycle': return <Bike className="h-3 w-3" />;
      default: return <Car className="h-3 w-3" />;
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Card className={cn(
      "transition-all duration-300",
      isFullscreen && "fixed inset-0 z-50 rounded-none"
    )}>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <CardTitle className="text-base sm:text-lg font-mono flex items-center gap-2">
            <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="hidden sm:inline">Advanced</span> Detection
            {isNative && (
              <Badge variant="outline" className="text-[10px] px-1.5">NATIVE</Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-1 sm:gap-2">
            {isActive && (
              <Badge variant="secondary" className="text-[10px] font-mono">
                {fps} FPS
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowOverlay(!showOverlay)}
            >
              {showOverlay ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setAudioAlerts(!audioAlerts)}
            >
              {audioAlerts ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hidden sm:flex"
              onClick={toggleFullscreen}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={isActive ? stopCamera : startCamera}
              variant={isActive ? "destructive" : "default"}
              disabled={!model || modelLoading}
              size="sm"
              className="text-xs sm:text-sm"
            >
              {isActive ? (
                <>
                  <CameraOff className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Stop</span>
                </>
              ) : (
                <>
                  <Camera className="mr-1 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Start</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3">
            <div>
              <label className="text-xs font-mono text-muted-foreground">
                Detection Sensitivity: {(sensitivity * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.3"
                max="0.8"
                step="0.05"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full mt-1"
              />
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {/* Loading progress */}
        {modelLoading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono mb-1">
              <span>Loading AI Model...</span>
              <span>{loadingProgress}%</span>
            </div>
            <Progress value={loadingProgress} className="h-2" />
          </div>
        )}
        
        {/* Camera view */}
        <div className={cn(
          "relative bg-black rounded-lg overflow-hidden",
          isFullscreen ? "h-[calc(100vh-200px)]" : "aspect-video"
        )}>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-contain"
          />
          
          {/* Inactive state */}
          {!isActive && !modelLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-black/80">
              <div className="text-center p-4">
                <Camera className="h-10 w-10 sm:h-16 sm:w-16 mx-auto mb-2 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">Camera inactive</p>
                <p className="text-xs sm:text-sm opacity-70 mt-1">
                  {model ? 'Press Start to begin detection' : 'Loading AI model...'}
                </p>
              </div>
            </div>
          )}

          {/* Collision risk overlay */}
          {isActive && isRideActive && collisionRisk > 0 && (
            <div className={cn(
              "absolute top-2 left-2 sm:top-4 sm:left-4 p-2 sm:p-3 rounded-lg backdrop-blur-sm",
              collisionRisk >= 80 ? "bg-danger/90 animate-pulse" :
              collisionRisk >= 50 ? "bg-warning/90" : "bg-safe/90"
            )}>
              <div className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-mono text-sm sm:text-base font-bold">
                  Risk: {collisionRisk.toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Speed display */}
          {isActive && isRideActive && detections.length > 0 && (
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/70 backdrop-blur-sm p-2 sm:p-3 rounded-lg">
              <div className="flex items-center gap-2 text-white">
                <Gauge className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-mono text-lg sm:text-xl font-bold">
                  {Math.max(...detections.map(d => d.speed), 0).toFixed(0)} km/h
                </span>
              </div>
            </div>
          )}

          {/* Detection count */}
          {isActive && detections.length > 0 && (
            <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/70 backdrop-blur-sm p-2 sm:p-3 rounded-lg">
              <div className="flex flex-wrap items-center gap-2">
                {detections.slice(0, 4).map((d, i) => (
                  <Badge
                    key={i}
                    variant={d.riskLevel === 'danger' ? 'destructive' : 
                            d.riskLevel === 'warning' ? 'default' : 'secondary'}
                    className="text-[10px] sm:text-xs flex items-center gap-1"
                  >
                    {getVehicleIcon(d.class)}
                    <span>{d.distance.toFixed(0)}m</span>
                  </Badge>
                ))}
                {detections.length > 4 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{detections.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedCameraDetection;
