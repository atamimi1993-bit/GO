import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MessageBubble } from '@/components/admin/DriverRecruiterMessage';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
import { TrendingUp, Send, Loader2, RefreshCw, Sparkles, Trophy, AlertCircle } from 'lucide-react';

const QUICK_PROMPTS = [
  'Analyze all drivers and identify who needs coaching most',
  'Generate a coaching report for the lowest-rated driver',
  'Create coaching tips for a driver with low earnings',
  'Find drivers with declining performance',
  'Generate general best-practice tips for all drivers',
];

export default function DriverCoach() {
  const { toast } = useToast();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coachingResults, setCoachingResults] = useState([]);
  const messagesEndRef = useRef(null);

  const loadConversation = useCallback(async () => {
    try {
      const convos = await base44.agents.listConversations({ agent_name: 'driver_coach' });
      if (convos && convos.length > 0) {
        const conv = convos[0];
        setConversation(conv);
        setMessages(conv.messages || []);
      } else {
        const conv = base44.agents.createConversation({
          agent_name: 'driver_coach',
          metadata: { name: 'Driver Coach', description: 'AI driver performance coaching' },
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
        <div className="bg-orange-500 rounded-xl p-2.5 flex items-center justify-center">
          <TrendingUp className="text-white" size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg">AI Driver Performance Coach</h2>
          <p className="text-muted-foreground text-sm">Analyzes driver metrics and sends personalized coaching tips.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadConversation} title="Refresh">
          <RefreshCw size={18} />
        </Button>
      </div>

      <div className="max-h-[400px] overflow-y-auto mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={28} className="text-orange-600" />
            </div>
            <h3 className="font-display font-bold mb-1">Driver Coach Ready</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">Ask me to analyze drivers, generate coaching reports, or identify who needs help.</p>
            <div className="grid gap-2 max-w-md mx-auto">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={sending}
                  className="text-left p-3 rounded-xl border bg-background hover:bg-muted/50 transition-colors text-sm disabled:opacity-50"
                >
                  {prompt}
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
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                <TrendingUp size={16} className="text-orange-600" />
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
            placeholder="Ask the coach to analyze drivers or generate tips..."
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={() => handleSend()} disabled={sending || !input.trim()} size="icon" className="shrink-0 bg-orange-500 hover:bg-orange-600">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}