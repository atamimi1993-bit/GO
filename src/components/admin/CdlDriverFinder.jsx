import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { MessageBubble } from '@/components/admin/DriverRecruiterMessage';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
import { Truck, Send, Loader2, RefreshCw, IdCard, MapPin, Users, GraduationCap } from 'lucide-react';

const QUICK_PROMPTS = [
  { icon: IdCard, label: 'Find CDL Class A drivers', text: 'Find CDL Class A drivers near me' },
  { icon: Truck, label: 'Find CDL Class B drivers', text: 'Find CDL Class B drivers in Texas' },
  { icon: Users, label: 'Find box truck operators', text: 'Find box truck operators looking for work' },
  { icon: GraduationCap, label: 'Find certified movers', text: 'Find certified professional movers in my area' },
  { icon: MapPin, label: 'Find all driver types in a city', text: 'Find all types of CDL and certified drivers in Atlanta, GA' },
];

export default function CdlDriverFinder() {
  const { toast } = useToast();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const loadConversation = useCallback(async () => {
    try {
      const convos = await base44.agents.listConversations({ agent_name: 'cdl_driver_finder' });
      if (convos && convos.length > 0) {
        const conv = convos[0];
        setConversation(conv);
        setMessages(conv.messages || []);
      } else {
        const conv = base44.agents.createConversation({
          agent_name: 'cdl_driver_finder',
          metadata: { name: 'CDL Driver Finder', description: 'AI CDL & certified driver sourcing' },
        });
        setConversation(conv);
        setMessages([]);
      }
    } catch (err) {
      toast({ title: 'Failed to load conversation', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const content = (text || input).trim();
    if (!content || !conversation || sending) return;
    setInput('');
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content });
    } catch (err) {
      toast({ title: 'Failed to send message', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <SectionSkeleton />;
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-amber-500 rounded-xl p-2.5 flex items-center justify-center">
          <Truck className="text-white" size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg">AI CDL & Certified Driver Finder</h2>
          <p className="text-muted-foreground text-sm">Searches the web for CDL Class A/B drivers, certified movers, and box truck operators, then generates outreach content to recruit them.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadConversation} title="Refresh" aria-label="Refresh CDL driver finder conversation">
          <RefreshCw size={18} />
        </Button>
      </div>

      <div className="max-h-[400px] overflow-y-auto mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
              <Truck size={28} className="text-amber-600" />
            </div>
            <h3 className="font-display font-bold mb-1">CDL Driver Finder Ready</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">I can search the web for CDL Class A/B drivers, certified professional movers, and box truck operators by location, find driver communities and job boards, and generate outreach content to recruit them.</p>
            <div className="grid gap-2 max-w-md mx-auto">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => handleSend(prompt.text)}
                  disabled={sending}
                  className="text-left p-3 rounded-xl border bg-background hover:bg-muted/50 transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  <prompt.icon size={14} className="text-amber-500 shrink-0" />
                  <div>
                    <p className="font-medium text-xs">{prompt.label}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{prompt.text}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {sending && (
          <div className="flex justify-start mb-4">
            <div className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Truck size={16} className="text-amber-600" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-background border">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t pt-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask the finder to search for CDL drivers in a city..."
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={() => handleSend()} disabled={sending || !input.trim()} size="icon" className="shrink-0 bg-amber-500 hover:bg-amber-600" aria-label="Send message">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}