import { useState } from 'react';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlayCircle } from 'lucide-react';

const DemoDataButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const generateDemoData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-demo-data');
      
      if (error) throw error;

      toast.success('Demo data generated! Check the dashboard for updates.');
      console.log('Demo data response:', data);
    } catch (error) {
      console.error('Error generating demo data:', error);
      toast.error('Failed to generate demo data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={generateDemoData}
      disabled={isLoading}
      size="lg"
      className="font-mono"
    >
      <PlayCircle className="mr-2 h-5 w-5" />
      {isLoading ? 'Generating...' : 'Generate Demo Data'}
    </Button>
  );
};

export default DemoDataButton;
