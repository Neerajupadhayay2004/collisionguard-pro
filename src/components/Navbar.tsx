import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield, Map, History, Settings, Activity, Phone } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import NetworkStatusIndicator from '@/components/NetworkStatusIndicator';
import { cn } from '@/lib/utils';

interface NavbarProps {
  networkConnected: boolean;
  connectionType: string;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  isWifi: boolean;
  isCellular: boolean;
}

const navLinks = [
  { to: '/', label: 'Dashboard', icon: Map },
  { to: '/features', label: 'Features', icon: Activity },
  { to: '/history', label: 'History', icon: History },
  { to: '/emergency', label: 'Emergency', icon: Phone },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const Navbar = ({ networkConnected, connectionType, connectionQuality, isWifi, isCellular }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <Shield className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold font-mono gradient-text">Eco Rider AI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <NetworkStatusIndicator
              connected={networkConnected}
              connectionType={connectionType}
              connectionQuality={connectionQuality}
              isWifi={isWifi}
              isCellular={isCellular}
              compact
            />
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-muted text-muted-foreground touch-target"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-sm transition-all touch-target",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
