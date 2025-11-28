import { useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Camera, CameraOff, Gauge } from 'lucide-react';
import { toast } from 'sonner';

interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
  speed?: number;
}

interface CameraDetectionProps {
  onSpeedDetected: (speed: number) => void;
  isRideActive: boolean;
}

const CameraDetection = ({ onSpeedDetected, isRideActive }: CameraDetectionProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [relativeSpeed, setRelativeSpeed] = useState<number>(0);
  const previousDetectionsRef = useRef<Map<string, { bbox: number[]; timestamp: number }>>(new Map());
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    loadModel();
    return () => {
      stopCamera();
    };
  }, []);

  const loadModel = async () => {
    try {
      console.log('Loading COCO-SSD model...');
      const loadedModel = await cocoSsd.load();
      setModel(loadedModel);
      console.log('Model loaded successfully');
      toast.success('AI model loaded successfully');
    } catch (error) {
      console.error('Error loading model:', error);
      toast.error('Failed to load detection model');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsActive(true);
        toast.success('Camera started');
        detectObjects();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsActive(false);
    toast.info('Camera stopped');
  };

  const calculateSpeed = (
    prevBbox: number[],
    currentBbox: number[],
    timeDelta: number
  ): number => {
    // Calculate distance moved (pixels)
    const prevCenterX = prevBbox[0] + prevBbox[2] / 2;
    const prevCenterY = prevBbox[1] + prevBbox[3] / 2;
    const currentCenterX = currentBbox[0] + currentBbox[2] / 2;
    const currentCenterY = currentBbox[1] + currentBbox[3] / 2;

    const pixelDistance = Math.sqrt(
      Math.pow(currentCenterX - prevCenterX, 2) +
      Math.pow(currentCenterY - prevCenterY, 2)
    );

    // Convert to estimated speed (pixels/ms to km/h)
    // This is a rough estimation and would need calibration
    const estimatedSpeed = (pixelDistance / timeDelta) * 3.6 * 10;
    return Math.min(estimatedSpeed, 150); // Cap at 150 km/h
  };

  const detectObjects = async () => {
    if (!model || !videoRef.current || !canvasRef.current || !isRideActive) {
      animationFrameRef.current = requestAnimationFrame(detectObjects);
      return;
    }

    try {
      const predictions = await model.detect(videoRef.current);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw video frame
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const now = Date.now();
      let maxSpeed = 0;
      const newDetections: Detection[] = [];

      // Vehicle-related classes
      const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];

      predictions.forEach((prediction) => {
        if (vehicleClasses.includes(prediction.class)) {
          const [x, y, width, height] = prediction.bbox;
          
          // Calculate speed if we have previous detection
          const key = `${prediction.class}-${Math.round(x/10)}`;
          const prevDetection = previousDetectionsRef.current.get(key);
          let speed = 0;

          if (prevDetection) {
            const timeDelta = now - prevDetection.timestamp;
            if (timeDelta > 0) {
              speed = calculateSpeed(prevDetection.bbox, prediction.bbox, timeDelta);
              maxSpeed = Math.max(maxSpeed, speed);
            }
          }

          // Store current detection
          previousDetectionsRef.current.set(key, {
            bbox: prediction.bbox,
            timestamp: now
          });

          newDetections.push({
            class: prediction.class,
            score: prediction.score,
            bbox: prediction.bbox as [number, number, number, number],
            speed
          });

          // Draw bounding box
          const color = speed > 60 ? '#ef4444' : speed > 40 ? '#f59e0b' : '#10b981';
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);

          // Draw label with speed
          ctx.fillStyle = color;
          ctx.fillRect(x, y - 30, width, 30);
          ctx.fillStyle = '#ffffff';
          ctx.font = '16px monospace';
          ctx.fillText(
            `${prediction.class} ${speed > 0 ? `${speed.toFixed(0)} km/h` : ''}`,
            x + 5,
            y - 10
          );
        }
      });

      setDetections(newDetections);
      
      if (maxSpeed > 0) {
        setRelativeSpeed(maxSpeed);
        onSpeedDetected(maxSpeed);
      }

      // Clean old detections (older than 2 seconds)
      previousDetectionsRef.current.forEach((value, key) => {
        if (now - value.timestamp > 2000) {
          previousDetectionsRef.current.delete(key);
        }
      });

    } catch (error) {
      console.error('Detection error:', error);
    }

    animationFrameRef.current = requestAnimationFrame(detectObjects);
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold font-mono flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Camera Detection
        </h3>
        <Button
          onClick={isActive ? stopCamera : startCamera}
          variant={isActive ? "destructive" : "default"}
          disabled={!model}
        >
          {isActive ? (
            <>
              <CameraOff className="mr-2 h-4 w-4" />
              Stop Camera
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Start Camera
            </>
          )}
        </Button>
      </div>

      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="absolute inset-0 w-full h-full"
        />
        
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Camera inactive</p>
            </div>
          </div>
        )}

        {isActive && isRideActive && (
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm p-3 rounded-lg">
            <div className="flex items-center gap-2 text-white">
              <Gauge className="h-5 w-5" />
              <span className="font-mono text-xl font-bold">
                {relativeSpeed.toFixed(0)} km/h
              </span>
            </div>
          </div>
        )}

        {isActive && detections.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm p-3 rounded-lg">
            <p className="text-white text-sm font-mono">
              Detected: {detections.length} vehicle(s)
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CameraDetection;
