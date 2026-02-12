import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('eco-rider-theme');
      if (stored) return stored === 'dark';
      return true; // default dark
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('eco-rider-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('eco-rider-theme', 'light');
    }
  }, [isDark]);

  // Apply on mount
  useEffect(() => {
    const stored = localStorage.getItem('eco-rider-theme');
    if (stored === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsDark(!isDark)}
      className="h-9 w-9"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
};

export default ThemeToggle;
