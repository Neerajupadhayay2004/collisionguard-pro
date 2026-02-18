import { Shield, Github, Mail, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold font-mono gradient-text">Eco Rider AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-Powered Real-time Collision Prevention & Driver Safety System
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-mono font-semibold text-foreground mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
              <li><Link to="/features" className="text-sm text-muted-foreground hover:text-primary transition-colors">Features</Link></li>
              <li><Link to="/history" className="text-sm text-muted-foreground hover:text-primary transition-colors">Trip History</Link></li>
              <li><Link to="/emergency" className="text-sm text-muted-foreground hover:text-primary transition-colors">Emergency</Link></li>
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="font-mono font-semibold text-foreground mb-3">Features</h3>
            <ul className="space-y-2">
              <li className="text-sm text-muted-foreground">Collision Detection</li>
              <li className="text-sm text-muted-foreground">Speed Monitoring</li>
              <li className="text-sm text-muted-foreground">Fatigue Detection</li>
              <li className="text-sm text-muted-foreground">Emergency SOS</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-mono font-semibold text-foreground mb-3">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a href="mailto:support@ecorider.ai" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Mail className="h-4 w-4" /> support@ecorider.ai
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Github className="h-4 w-4" /> GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground font-mono">
            © {new Date().getFullYear()} Eco Rider AI. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-destructive" /> for safer roads
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
