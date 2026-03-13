import { Link } from 'react-router-dom';
import { Shield, Navigation, Wifi, WifiOff, Bluetooth, MapPin, Activity, Zap, ChevronRight, Star, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-safe/5 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-mono mb-6 border border-primary/20">
            <Zap className="h-4 w-4" />
            AI-Powered Safety System
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold font-mono mb-6 leading-tight">
            <span className="gradient-text">Eco Rider AI</span>
            <br />
            <span className="text-foreground/80 text-2xl sm:text-3xl md:text-4xl">
              Collision Prevention & Smart Riding
            </span>
          </h1>
          
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Real-time collision detection, AI-powered route safety, voice commands, 
            offline maps & Bluetooth connectivity — all in one app.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/dashboard">
              <Button size="lg" className="text-lg px-8 py-6 font-mono shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                <Navigation className="mr-2 h-5 w-5" />
                Open Dashboard
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/features">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-mono w-full sm:w-auto border-2">
                Explore Features
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-safe" />
              <span className="text-sm font-mono">Real-time Protection</span>
            </div>
            <div className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-warning" />
              <span className="text-sm font-mono">Works Offline</span>
            </div>
            <div className="flex items-center gap-2">
              <Bluetooth className="h-5 w-5 text-primary" />
              <span className="text-sm font-mono">Bluetooth Connected</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 md:py-24 px-4 bg-card/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-mono mb-4 text-foreground">
              Why <span className="gradient-text">Eco Rider AI</span>?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Advanced safety features that work everywhere — online, offline, and via Bluetooth.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Collision Detection",
                desc: "AI-powered camera detection identifies vehicles and calculates collision risks in real-time.",
                color: "text-danger"
              },
              {
                icon: MapPin,
                title: "Offline Maps & GPS",
                desc: "Full location tracking and cached maps work without internet. Never lose your way.",
                color: "text-safe"
              },
              {
                icon: Bluetooth,
                title: "Bluetooth Sensors",
                desc: "Connect OBD2, speed sensors, and nearby riders via Bluetooth for enhanced monitoring.",
                color: "text-primary"
              },
              {
                icon: Navigation,
                title: "AI Safe Routes",
                desc: "Machine learning suggests the safest routes based on historical collision data.",
                color: "text-warning"
              },
              {
                icon: Activity,
                title: "Real-time Tracking",
                desc: "Live vehicle tracking, speed monitoring, and proximity alerts for nearby vehicles.",
                color: "text-safe"
              },
              {
                icon: WifiOff,
                title: "Full Offline Mode",
                desc: "Cache routes, maps, collision data. Auto-sync when back online. Zero data loss.",
                color: "text-warning"
              },
            ].map((feature, i) => (
              <Card key={i} className="p-6 bg-card border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg group">
                <feature.icon className={`h-10 w-10 ${feature.color} mb-4 group-hover:scale-110 transition-transform`} />
                <h3 className="text-lg font-bold font-mono mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "99.9%", label: "Uptime", icon: Globe },
              { value: "< 50ms", label: "Alert Speed", icon: Zap },
              { value: "100%", label: "Offline Ready", icon: WifiOff },
              { value: "24/7", label: "Monitoring", icon: Shield },
            ].map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-xl bg-card border border-border">
                <stat.icon className="h-6 w-6 text-primary mx-auto mb-3" />
                <p className="text-2xl md:text-3xl font-bold font-mono gradient-text">{stat.value}</p>
                <p className="text-sm text-muted-foreground font-mono mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 bg-primary/5 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-mono mb-4 text-foreground">
            Ready to Ride Safe?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Start using Eco Rider AI now. No signup needed — works instantly, even offline.
          </p>
          <Link to="/dashboard">
            <Button size="lg" className="text-lg px-10 py-6 font-mono shadow-lg">
              <Navigation className="mr-2 h-5 w-5" />
              Launch Dashboard
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Landing;
