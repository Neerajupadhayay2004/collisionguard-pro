import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface BluetoothDevice {
  id: string;
  name: string;
  type: 'obd2' | 'speed_sensor' | 'rider' | 'unknown';
  connected: boolean;
  rssi?: number;
  lastSeen: number;
}

interface OBD2Data {
  speed: number;
  rpm: number;
  engineTemp: number;
  fuelLevel: number;
  batteryVoltage: number;
  timestamp: number;
}

export function useBluetooth() {
  const [isSupported] = useState(() => 'bluetooth' in navigator);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<BluetoothDevice[]>([]);
  const [nearbyRiders, setNearbyRiders] = useState<BluetoothDevice[]>([]);
  const [obd2Data, setObd2Data] = useState<OBD2Data | null>(null);
  const [btSpeed, setBtSpeed] = useState<number>(0);
  const deviceRef = useRef<any>(null);
  const serverRef = useRef<any>(null);

  // Scan for nearby Bluetooth devices
  const scanDevices = useCallback(async () => {
    if (!isSupported) {
      toast.error('Bluetooth not supported on this device');
      return;
    }

    try {
      setIsScanning(true);
      
      // Web Bluetooth API
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000fff0-0000-1000-8000-00805f9b34fb', // OBD2 common service
          '00001816-0000-1000-8000-00805f9b34fb', // Cycling Speed and Cadence
          '0000180d-0000-1000-8000-00805f9b34fb', // Heart Rate (for rider detection)
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
        ],
      });

      if (device) {
        deviceRef.current = device;
        const type = detectDeviceType(device.name || '');
        
        const btDevice: BluetoothDevice = {
          id: device.id,
          name: device.name || 'Unknown Device',
          type,
          connected: false,
          lastSeen: Date.now(),
        };

        setConnectedDevices(prev => {
          const exists = prev.find(d => d.id === btDevice.id);
          if (exists) return prev;
          return [...prev, btDevice];
        });

        toast.success(`Found: ${btDevice.name}`);
        
        // Auto-connect
        await connectDevice(device, btDevice);
      }
    } catch (error: any) {
      if (error.name !== 'NotFoundError') {
        console.error('Bluetooth scan error:', error);
        toast.error('Bluetooth scan failed');
      }
    } finally {
      setIsScanning(false);
    }
  }, [isSupported]);

  // Detect device type from name
  const detectDeviceType = (name: string): BluetoothDevice['type'] => {
    const lower = name.toLowerCase();
    if (lower.includes('obd') || lower.includes('elm') || lower.includes('vlink') || lower.includes('torque')) return 'obd2';
    if (lower.includes('speed') || lower.includes('cadence') || lower.includes('sensor')) return 'speed_sensor';
    if (lower.includes('rider') || lower.includes('eco') || lower.includes('helmet')) return 'rider';
    return 'unknown';
  };

  // Connect to a Bluetooth device
  const connectDevice = useCallback(async (device: any, btDevice: BluetoothDevice) => {
    try {
      const server = await device.gatt?.connect();
      if (!server) return;
      
      serverRef.current = server;
      
      setConnectedDevices(prev =>
        prev.map(d => d.id === btDevice.id ? { ...d, connected: true } : d)
      );

      toast.success(`Connected to ${btDevice.name}`);

      // Start reading data based on type
      if (btDevice.type === 'obd2') {
        await startOBD2Reading(server);
      } else if (btDevice.type === 'speed_sensor') {
        await startSpeedReading(server);
      }

      // Listen for disconnect
      device.addEventListener('gattserverdisconnected', () => {
        setConnectedDevices(prev =>
          prev.map(d => d.id === btDevice.id ? { ...d, connected: false } : d)
        );
        toast.info(`${btDevice.name} disconnected`);
      });
    } catch (error) {
      console.error('Connection error:', error);
      toast.error(`Failed to connect to ${btDevice.name}`);
    }
  }, []);

  // Read OBD2 data
  const startOBD2Reading = useCallback(async (server: any) => {
    try {
      const service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
      const characteristics = await service.getCharacteristics();
      
      for (const char of characteristics) {
        if (char.properties.notify) {
          await char.startNotifications();
          char.addEventListener('characteristicvaluechanged', (event: any) => {
            const value = event.target.value;
            const data = parseOBD2Data(value);
            if (data) {
              setObd2Data(data);
              setBtSpeed(data.speed);
            }
          });
        }
      }
    } catch (error) {
      console.error('OBD2 reading error:', error);
    }
  }, []);

  // Read speed sensor
  const startSpeedReading = useCallback(async (server: any) => {
    try {
      const service = await server.getPrimaryService('00001816-0000-1000-8000-00805f9b34fb');
      const char = await service.getCharacteristic('00002a5b-0000-1000-8000-00805f9b34fb');
      
      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        const speed = parseSpeedData(value);
        setBtSpeed(speed);
      });
    } catch (error) {
      console.error('Speed sensor error:', error);
    }
  }, []);

  // Parse OBD2 data from raw bytes
  const parseOBD2Data = (dataView: DataView): OBD2Data | null => {
    try {
      return {
        speed: dataView.getUint8(0),
        rpm: dataView.getUint16(1, true),
        engineTemp: dataView.getInt8(3) + 40,
        fuelLevel: dataView.getUint8(4),
        batteryVoltage: dataView.getUint16(5, true) / 100,
        timestamp: Date.now(),
      };
    } catch {
      return null;
    }
  };

  // Parse speed sensor data
  const parseSpeedData = (dataView: DataView): number => {
    try {
      const wheelRevolutions = dataView.getUint32(1, true);
      const lastWheelEvent = dataView.getUint16(5, true);
      // Approximate speed from wheel revolutions (assuming ~2.1m wheel circumference)
      return (wheelRevolutions * 2.1 * 3.6) / (lastWheelEvent / 1024);
    } catch {
      return 0;
    }
  };

  // Disconnect all devices
  const disconnectAll = useCallback(async () => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    setConnectedDevices(prev => prev.map(d => ({ ...d, connected: false })));
    setObd2Data(null);
    setBtSpeed(0);
    toast.info('All Bluetooth devices disconnected');
  }, []);

  // Simulate nearby rider detection (BLE advertising)
  const detectNearbyRiders = useCallback(() => {
    // In real app, this would use BLE scanning for other Eco Rider AI instances
    // Web Bluetooth doesn't support passive scanning, but native Capacitor BLE plugin can
    const mockRiders: BluetoothDevice[] = [];
    setNearbyRiders(mockRiders);
    return mockRiders;
  }, []);

  return {
    isSupported,
    isScanning,
    connectedDevices,
    nearbyRiders,
    obd2Data,
    btSpeed,
    scanDevices,
    disconnectAll,
    detectNearbyRiders,
  };
}
