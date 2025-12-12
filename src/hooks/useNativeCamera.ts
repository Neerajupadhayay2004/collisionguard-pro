import { useState, useCallback, useRef } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { toast } from 'sonner';

interface UseNativeCameraOptions {
  quality?: number;
  width?: number;
  height?: number;
  correctOrientation?: boolean;
}

export function useNativeCamera(options: UseNativeCameraOptions = {}) {
  const {
    quality = 90,
    width = 1280,
    height = 720,
    correctOrientation = true,
  } = options;

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isNative = () => {
    return typeof window !== 'undefined' && 
           (window as any).Capacitor?.isNativePlatform?.();
  };

  // Check camera permissions
  const checkPermissions = useCallback(async () => {
    try {
      if (isNative()) {
        const status = await Camera.checkPermissions();
        if (status.camera === 'granted') {
          setHasPermission(true);
          return true;
        } else if (status.camera === 'denied') {
          setHasPermission(false);
          return false;
        } else {
          const requested = await Camera.requestPermissions();
          const granted = requested.camera === 'granted';
          setHasPermission(granted);
          return granted;
        }
      } else {
        // Web - permission checked on stream request
        setHasPermission(true);
        return true;
      }
    } catch (err) {
      console.error('Camera permission check failed:', err);
      setHasPermission(false);
      return false;
    }
  }, []);

  // Take a single photo using native camera
  const takePhoto = useCallback(async (): Promise<Photo | null> => {
    try {
      setIsCapturing(true);
      setError(null);

      if (isNative()) {
        const image = await Camera.getPhoto({
          quality,
          width,
          height,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
          correctOrientation,
        });

        setPhoto(image);
        return image;
      } else {
        // Web fallback - capture from video stream
        if (!streamRef.current || !videoRef.current) {
          toast.error('Camera not started. Start stream first.');
          return null;
        }

        const canvas = document.createElement('canvas');
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        ctx.drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', quality / 100).split(',')[1];

        const image: Photo = {
          base64String: base64,
          format: 'jpeg',
          saved: false,
        };

        setPhoto(image);
        return image;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to take photo';
      setError(errorMessage);
      console.error('Camera error:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [quality, width, height, correctOrientation]);

  // Pick image from gallery
  const pickFromGallery = useCallback(async (): Promise<Photo | null> => {
    try {
      setIsCapturing(true);
      setError(null);

      if (isNative()) {
        const image = await Camera.getPhoto({
          quality,
          width,
          height,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Photos,
          correctOrientation,
        });

        setPhoto(image);
        return image;
      } else {
        // Web fallback - file input
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
              resolve(null);
              return;
            }

            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              const image: Photo = {
                base64String: base64,
                format: file.type.split('/')[1] || 'jpeg',
                saved: false,
              };
              setPhoto(image);
              resolve(image);
            };
            reader.readAsDataURL(file);
          };
          input.click();
        });
      }
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [quality, width, height, correctOrientation]);

  // Start continuous camera stream (for video-based detection)
  const startStream = useCallback(async (
    videoElement: HTMLVideoElement,
    facingMode: 'user' | 'environment' = 'environment'
  ): Promise<MediaStream | null> => {
    try {
      const hasPerms = await checkPermissions();
      if (!hasPerms) {
        toast.error('Camera permission required');
        return null;
      }

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current = videoElement;
      videoElement.srcObject = stream;
      await videoElement.play();

      setError(null);
      return stream;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to start camera stream';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  }, [checkPermissions, width, height]);

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
  }, []);

  // Capture frame from current stream (for continuous detection)
  const captureFrame = useCallback((): ImageData | null => {
    if (!videoRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  // Get photo as base64 data URL
  const getPhotoDataUrl = useCallback((photoToConvert?: Photo): string | null => {
    const p = photoToConvert || photo;
    if (!p?.base64String) return null;
    return `data:image/${p.format};base64,${p.base64String}`;
  }, [photo]);

  return {
    photo,
    isCapturing,
    hasPermission,
    error,
    takePhoto,
    pickFromGallery,
    startStream,
    stopStream,
    captureFrame,
    checkPermissions,
    getPhotoDataUrl,
    isNative: isNative(),
  };
}
