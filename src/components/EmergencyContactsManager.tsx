import { useState, useEffect } from 'react';
import { Users, Phone, Mail, Star, Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  is_primary: boolean;
}

const EmergencyContactsManager = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' });
  const [editContact, setEditContact] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });

    if (!error && data) {
      setContacts(data);
    }
  };

  const addContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    const { error } = await supabase.from('emergency_contacts').insert({
      name: newContact.name.trim(),
      phone: newContact.phone.trim(),
      email: newContact.email.trim() || null,
      is_primary: contacts.length === 0,
    });

    if (error) {
      toast.error('Failed to add contact');
      return;
    }

    toast.success('Contact added');
    setNewContact({ name: '', phone: '', email: '' });
    setIsAdding(false);
    fetchContacts();
  };

  const updateContact = async (id: string) => {
    if (!editContact.name.trim() || !editContact.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    const { error } = await supabase
      .from('emergency_contacts')
      .update({
        name: editContact.name.trim(),
        phone: editContact.phone.trim(),
        email: editContact.email.trim() || null,
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update contact');
      return;
    }

    toast.success('Contact updated');
    setEditingId(null);
    fetchContacts();
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id);

    if (!error) {
      toast.success('Contact removed');
      fetchContacts();
    }
  };

  const setPrimary = async (id: string) => {
    // Remove primary from all
    await supabase
      .from('emergency_contacts')
      .update({ is_primary: false })
      .neq('id', id);

    // Set primary for selected
    await supabase
      .from('emergency_contacts')
      .update({ is_primary: true })
      .eq('id', id);

    toast.success('Primary contact updated');
    fetchContacts();
  };

  const startEdit = (contact: EmergencyContact) => {
    setEditingId(contact.id);
    setEditContact({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
    });
  };

  const callContact = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Emergency Contacts
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(!isAdding)}
            className="h-7 w-7 p-0"
          >
            <Plus className={cn("h-4 w-4 transition-transform", isAdding && "rotate-45")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add New Contact Form */}
        {isAdding && (
          <div className="bg-muted/50 p-3 rounded-lg space-y-2 animate-in fade-in slide-in-from-top-2">
            <Input
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              placeholder="Name"
              className="h-8 text-sm bg-background"
            />
            <Input
              type="tel"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              placeholder="Phone number"
              className="h-8 text-sm bg-background"
            />
            <Input
              type="email"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              placeholder="Email (optional)"
              className="h-8 text-sm bg-background"
            />
            <div className="flex gap-2">
              <Button onClick={addContact} size="sm" className="flex-1 h-8">
                <Check className="h-3 w-3 mr-1" />
                Add
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsAdding(false)}
                className="h-8"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Contacts List */}
        <ScrollArea className="h-52">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-mono">No emergency contacts</p>
              <p className="text-[10px]">Add contacts to notify in emergencies</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={cn(
                    "p-2 rounded-lg border transition-all",
                    contact.is_primary 
                      ? "border-primary/50 bg-primary/5" 
                      : "border-border bg-muted/30"
                  )}
                >
                  {editingId === contact.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editContact.name}
                        onChange={(e) => setEditContact({ ...editContact, name: e.target.value })}
                        className="h-7 text-xs bg-background"
                      />
                      <Input
                        type="tel"
                        value={editContact.phone}
                        onChange={(e) => setEditContact({ ...editContact, phone: e.target.value })}
                        className="h-7 text-xs bg-background"
                      />
                      <Input
                        type="email"
                        value={editContact.email}
                        onChange={(e) => setEditContact({ ...editContact, email: e.target.value })}
                        className="h-7 text-xs bg-background"
                        placeholder="Email (optional)"
                      />
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          onClick={() => updateContact(contact.id)}
                          className="flex-1 h-6 text-[10px]"
                        >
                          Save
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setEditingId(null)}
                          className="h-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm truncate">{contact.name}</span>
                          {contact.is_primary && (
                            <Star className="h-3 w-3 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono mt-0.5">
                          <Phone className="h-2.5 w-2.5" />
                          <span className="truncate">{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                            <Mail className="h-2.5 w-2.5" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => callContact(contact.phone)}
                          className="h-6 w-6 p-0 text-safe hover:text-safe hover:bg-safe/10"
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                        {!contact.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPrimary(contact.id)}
                            className="h-6 w-6 p-0"
                            title="Set as primary"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(contact)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteContact(contact.id)}
                          className="h-6 w-6 p-0 text-danger hover:text-danger hover:bg-danger/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Quick Actions */}
        {contacts.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground text-center font-mono">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''} • 
              Tap <Phone className="h-2.5 w-2.5 inline mx-0.5" /> to call
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmergencyContactsManager;
