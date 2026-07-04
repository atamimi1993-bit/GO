import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';
import { CalendarClock, Send, Loader2, Bot, RefreshCw, AlertTriangle, CheckCircle2, Calendar } from 'lucide-react';

const QUICK_PROMPTS = [
  'Scan the calendar for scheduling conflicts and double-bookings',
  'Find the best 3 dates for a new move in the next 30 days',
  'Check for drivers scheduled on dates they marked unavailable',
  'Find moves with no assigned driver in the next 7 days',
  'Review pending reschedule requests and recommend the best options',
];

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-primary' : 'bg-blue-500/10'}`}>
          {isUser ? <CalendarClock size={16} className="text-primary-foreground" /> : <Bot size={16} className="text-blue-600" />}
        </div>
        <div className={`rounded-2xl px-4 py-2.5 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>
          {message.content && (isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          ))}
          {message.tool_calls?.map((tc, i) => (
            <ToolCallDisplay key={i} toolCall={tc} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall.name || 'tool';
  const status = tc => {
    if (['failed', 'error'].includes(tc.status)) return { icon: AlertTriangle, color: 'text-red-500', label: 'Failed' };
    if (['completed', 'success'].includes(tc.status)) return { icon: CheckCircle2, color: 'text-emerald-500', label: 'Done' };
    return { icon: Loader2, color: 'text-amber-500', label: 'Running' };
  };
  const s = status(toolCall.status);
  const StatusIcon = s.icon;
  const isRunning = ['pending', 'running', 'in_progress'].includes(toolCall.status);
  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;

  let parsedResult = null;
  try {
    parsedResult = typeof toolCall.results === 'string' ? JSON.parse(toolCall.results) : toolCall.results;
  } catch {
    parsedResult = toolCall.results;
  }

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => !hideDetails && setExpanded(!expanded)}
        className={`flex items-center gap-1.5 ${hideDetails ? 'cursor-default' : 'hover:underline'}`}
      >
        <StatusIcon size={12} className={`${s.color} ${isRunning ? 'animate-spin' : ''}`} />
        <span className="font-medium">{proj.label || proj.active_label || name}</span>
        {!hideDetails && <span className="text-muted-foreground">▾</span>}
      </button>
      {expanded && !hideDetails && (
        <div className="mt-1.5 space-y-1.5 pl-4 border-l-2 border-border">
          {toolCall.arguments_string && (
            <div>
              <p className="font-semibold text-muted-foreground">Parameters:</p>
              <pre className="text-[10px] overflow-x-auto bg-muted/50 rounded p-1.5">{toolCall.arguments_string}</pre>
            </div>
          )}
          {toolCall.results && (
            <div>
              <p className="font-semibold text-muted-foreground">Result:</p>
              <pre className="text-[10px] overflow-x-auto bg-muted/50 rounded p-1.5">{typeof toolCall.results === 'string' ? toolCall.results : JSON.stringify(toolCall.results, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScheduleOptimizer() {
  const { scrollRef } = useOutletContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const loadConversation = useCallback(async () => {
    try {
      const convos = await base44.agents.listConversations({ agent_name: 'schedule_optimizer' });
      if (convos && convos.length > 0) {
        const conv = convos[0];
        setConversation(conv);
        setMessages(conv.messages || []);
      } else {
        const conv = base44.agents.createConversation({
          agent_name: 'schedule_optimizer',
          metadata: { name: 'Schedule Optimizer', description: 'AI calendar management & conflict resolution' },
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
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="bg-blue-500 rounded-xl p-2.5 flex items-center justify-center">
          <CalendarClock className="text-white" size={22} />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-display font-bold">Schedule Optimizer</h1>
          <p className="text-muted-foreground text-sm">AI calendar management — detects conflicts, finds optimal dates, auto-adjusts schedules.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={loadConversation} title="Refresh">
          <RefreshCw size={18} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-2" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-blue-600" />
            </div>
            <h3 className="font-display font-bold text-lg mb-1">Schedule Optimizer Ready</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Ask me to scan the calendar for conflicts, find the best dates for a new move, or auto-adjust schedules so everything works for everyone.
            </p>
            <div className="grid gap-2 max-w-md mx-auto">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={sending}
                  className="text-left p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors text-sm disabled:opacity-50"
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
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-blue-600" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-card border">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t pt-3 px-1 pb-2 bg-background">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask about scheduling, conflicts, or optimal dates..."
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={() => handleSend()} disabled={sending || !input.trim()} size="icon" className="shrink-0 bg-blue-500 hover:bg-blue-600">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>
    </div>
  );
}