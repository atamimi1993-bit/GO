import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MessageBubble } from '@/components/admin/DriverRecruiterMessage';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
import {
  Users, Send, Loader2, RefreshCw, Copy, Mail, MessageSquare, Phone, Share2,
  ChevronRight, MapPin,
} from 'lucide-react';

const QUICK_PROMPTS = [
  'Contact all new leads with a personalized email',
  'Generate a follow-up SMS for leads that haven\'t responded',
  'Write a phone script for qualifying a lead about their move',
  'Create a referral message for qualified leads',
  'Show me all leads that need to be contacted',
];

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  phone_script: Phone,
  social_dm: Share2,
  general: MessageSquare,
};

export default function LeadContactAssistant() {
  const { toast } = useToast();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [leadMessages, setLeadMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const loadConversation = useCallback(async () => {
    try {
      const convos = await base44.agents.listConversations({ agent_name: 'lead_outreach' });
      if (convos && convos.length > 0) {
        const conv = convos[0];
        setConversation(conv);
        setMessages(conv.messages || []);
      } else {
        const conv = base44.agents.createConversation({
          agent_name: 'lead_outreach',
          metadata: { name: 'Lead Contact Assistant', description: 'AI lead outreach & qualification' },
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

  const loadData = useCallback(async () => {
    try {
      const [leadList, msgList] = await Promise.all([
        base44.entities.Lead.list('-created_date', 20),
        base44.entities.LeadMessage.list('-created_date', 20),
      ]);
      setLeads(leadList);
      setLeadMessages(msgList);
    } catch {
      setLeads([]);
      setLeadMessages([]);
    }
  }, []);

  useEffect(() => {
    loadConversation();
    loadData();
  }, [loadConversation, loadData]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      const newMessages = data.messages || [];
      setMessages(newMessages);
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.tool_calls?.some(tc => ['completed', 'success'].includes(tc.status))) {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [conversation?.id, loadData]);

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

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to clipboard' });
  };

  const newLeads = leads.filter(l => l.status === 'new');
  const contactedLeads = leads.filter(l => l.status === 'contacted');

  if (loading) {
    return <SectionSkeleton />;
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-purple-500 rounded-xl p-2.5 flex items-center justify-center">
          <Users className="text-white" size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg">AI Lead Contact Assistant</h2>
          <p className="text-muted-foreground text-sm">Contacts leads, generates personalized outreach, and refers them to GO.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { loadConversation(); loadData(); }} title="Refresh">
          <RefreshCw size={18} />
        </Button>
      </div>

      {/* Lead stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <p className="text-xl font-bold text-blue-600">{newLeads.length}</p>
          <p className="text-[10px] text-muted-foreground">New Leads</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xl font-bold text-amber-600">{contactedLeads.length}</p>
          <p className="text-[10px] text-muted-foreground">Contacted</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <p className="text-xl font-bold text-emerald-600">{leadMessages.length}</p>
          <p className="text-[10px] text-muted-foreground">Messages Drafted</p>
        </div>
      </div>

      {/* Chat */}
      <div className="max-h-[400px] overflow-y-auto mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
              <Users size={28} className="text-purple-600" />
            </div>
            <h3 className="font-display font-bold mb-1">Lead Contact Assistant Ready</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">Ask me to contact leads, generate outreach messages, or qualify prospects.</p>
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
              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                <Users size={16} className="text-purple-600" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-background border">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-3 mb-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask the assistant to contact leads or generate messages..."
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={() => handleSend()} disabled={sending || !input.trim()} size="icon" className="shrink-0 bg-purple-500 hover:bg-purple-600">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>

      {/* New leads needing contact */}
      {newLeads.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-sm">Leads Needing Contact</h3>
            <Badge variant="secondary" className="text-[10px]">{newLeads.length} new</Badge>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {newLeads.slice(0, 5).map((lead) => (
              <button
                key={lead.id}
                onClick={() => handleSend(`Generate an initial email outreach for ${lead.lead_name} in ${lead.location}. They are looking to move because: ${lead.moving_reason || 'not specified'}. Timeline: ${lead.move_timeline || 'not specified'}.`)}
                disabled={sending}
                className="w-full flex items-center gap-2 p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              >
                <Users size={12} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate flex-1">{lead.lead_name}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                  <MapPin size={10} /> {lead.location}
                </span>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Generated messages */}
      {leadMessages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-sm">Generated Outreach Messages</h3>
            <span className="text-xs text-muted-foreground">{leadMessages.length} saved</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {leadMessages.map((msg) => {
              const Icon = CHANNEL_ICONS[msg.channel] || MessageSquare;
              return (
                <div key={msg.id} className="border rounded-xl p-3 bg-background">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={14} className="text-purple-500 shrink-0" />
                      <span className="text-sm font-medium truncate">{msg.lead_name}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{msg.message_type?.replace('_', ' ')}</Badge>
                  </div>
                  {msg.subject_line && (
                    <p className="text-xs font-medium mb-1 truncate">Subject: {msg.subject_line}</p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{msg.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{msg.channel?.replace('_', ' ')}</span>
                    <Button size="sm" variant="ghost" onClick={() => handleCopy(msg.content)} className="h-7 px-2 text-xs">
                      <Copy size={12} className="mr-1" /> Copy
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}