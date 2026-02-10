import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.4ec3380894a642c5a169346af33bd83f',
  appName: 'Eco Rider AI',
  webDir: 'dist',
  server: {
    url: 'https://4ec33808-94a6-42c5-a169-346af33bd83f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#080b14',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#080b14',
    },
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    backgroundColor: '#080b14',
  },
};

export default config;
