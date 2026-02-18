import { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useNativeSpeech } from '@/hooks/useNativeSpeech';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const {
    connected: networkConnected,
    connectionType,
    connectionQuality,
    isWifi,
    isCellular,
  } = useNetworkStatus({ showToasts: false });

  const { enableSpeech } = useNativeSpeech();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" onClick={enableSpeech}>
      <Navbar
        networkConnected={networkConnected}
        connectionType={connectionType}
        connectionQuality={connectionQuality}
        isWifi={isWifi}
        isCellular={isCellular}
      />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
