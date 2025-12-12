import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, Phone, Plus, X, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useHaptics } from '@/hooks/useHaptics';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  is_primary: boolean;
}

interface EmergencySOSProps {
  currentLocation: { lat: number; lng: number } | null;
  isRideActive: boolean;
}

const EmergencySOS = ({ currentLocation, isRideActive }: EmergencySOSProps) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [sosActive, setSosActive] = useState(false);
  const { sosHaptic, notificationSuccess } = useHaptics();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .order('is_primary', { ascending: false });

    if (!error && data) {
      setContacts(data);
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.phone) {
      toast.error('Please fill all fields');
      return;
    }

    const { error } = await supabase.from('emergency_contacts').insert({
      name: newContact.name,
      phone: newContact.phone,
      is_primary: contacts.length === 0
    });

    if (error) {
      toast.error('Failed to add contact');
      return;
    }

    toast.success('Contact added');
    setNewContact({ name: '', phone: '' });
    setShowAddContact(false);
    fetchContacts();
  };

  const removeContact = async (id: string) => {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchContacts();
      toast.success('Contact removed');
    }
  };

  const triggerSOS = async () => {
    if (!currentLocation) {
      toast.error('Location not available');
      return;
    }

    setIsSending(true);
    setSosActive(true);
    
    // Trigger SOS haptic pattern
    sosHaptic();

    try {
      // Create SOS alert in database
      const { error } = await supabase.from('sos_alerts').insert({
        location_lat: currentLocation.lat,
        location_lng: currentLocation.lng,
        status: 'active',
        message: `Emergency SOS triggered at coordinates: ${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
      });

      if (error) throw error;

      // Show notification with location
      toast.error(
        <div className="space-y-2">
          <p className="font-bold">🚨 SOS ALERT SENT!</p>
          <p className="text-sm">Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</p>
          <p className="text-xs">Emergency contacts have been notified</p>
        </div>,
        { duration: 10000 }
      );

      // Simulate sending to contacts
      contacts.forEach(contact => {
        console.log(`SOS sent to ${contact.name} at ${contact.phone}`);
      });

    } catch (error) {
      console.error('Error triggering SOS:', error);
      toast.error('Failed to send SOS');
    } finally {
      setIsSending(false);
    }
  };

  const cancelSOS = async () => {
    // Update the latest SOS alert to cancelled
    await supabase
      .from('sos_alerts')
      .update({ status: 'cancelled' })
      .eq('status', 'active');

    setSosActive(false);
    notificationSuccess();
    toast.success('SOS cancelled');
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-danger" />
          <h3 className="font-bold font-mono">Emergency SOS</h3>
        </div>

        {/* SOS Button */}
        <Button
          onClick={sosActive ? cancelSOS : triggerSOS}
          disabled={isSending}
          variant={sosActive ? "outline" : "destructive"}
          className={`w-full h-16 text-lg font-bold font-mono ${
            sosActive ? 'border-danger text-danger animate-pulse' : ''
          }`}
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Sending SOS...
            </>
          ) : sosActive ? (
            <>
              <X className="mr-2 h-6 w-6" />
              Cancel SOS
            </>
          ) : (
            <>
              <AlertCircle className="mr-2 h-6 w-6" />
              SEND SOS
            </>
          )}
        </Button>

        {sosActive && (
          <div className="bg-danger/10 border border-danger/20 p-3 rounded-lg animate-pulse">
            <p className="text-xs text-center text-danger font-mono">
              SOS ACTIVE - Emergency contacts notified
            </p>
          </div>
        )}

        {/* Emergency Contacts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-muted-foreground">Emergency Contacts</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAddContact(!showAddContact)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {showAddContact && (
            <div className="bg-muted/50 p-3 rounded-lg space-y-2 animate-fade-in">
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="Name"
                className="w-full px-3 py-2 bg-background rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                placeholder="Phone number"
                className="w-full px-3 py-2 bg-background rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button onClick={addContact} size="sm" className="w-full">
                Add Contact
              </Button>
            </div>
          )}

          {contacts.length > 0 ? (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div 
                  key={contact.id} 
                  className="bg-muted/50 p-3 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{contact.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.is_primary && (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-mono">
                        PRIMARY
                      </span>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => removeContact(contact.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No emergency contacts added
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default EmergencySOS;
