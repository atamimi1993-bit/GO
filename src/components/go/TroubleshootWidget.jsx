import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wrench, X, Send, Loader2, Zap, RefreshCw, CreditCard, Search, AlertTriangle, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  { icon: Zap, label: 'App is lagging or slow', text: 'The app is lagging or running slow. Help me troubleshoot.' },
  { icon: AlertTriangle, label: 'App crashed or froze', text: 'The app crashed or froze while I was using it. What should I do?' },
  { icon: CreditCard, label: 'Payment failed', text: 'My payment or checkout failed. Can you check my moves and help me figure out what went wrong?' },
  { icon: Search, label: 'My moves are missing', text: "I can't see my move requests or my data seems to be missing. Can you look into it?" },
  { icon: RefreshCw, label: 'Stuck move status', text: 'My move seems stuck in the same status for too long. Can you check what the holdup is?' },
  { icon: ShieldAlert, label: "Can't log in or blocked", text: "I'm having trouble logging in or I think I was blocked. Can you check if I was rate-limited?" },
];

function ToolCallBadge({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const isFailed = ['failed', 'error'].includes(toolCall.status) ||
    (typeof toolCall.results === 'string' && /error|failed/i.test(toolCall.results));
  const isRunning = ['pending', 'running', 'in_progress'].includes(toolCall.status);
  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;

  let parsedResults = null;
  try {
    parsedResults = typeof toolCall.results === 'string' ? JSON.parse(toolCall.results) : toolCall.results;
  } catch {
    parsedResults = toolCall.results;
  }

  return (
    <div className="mt-1.5 text-[10px]">
      <button
        onClick={() => !hideDetails && setExpanded(!expanded)}
        className={`flex items-center gap-1 ${hideDetails ? 'cursor-default' : 'hover:underline'}`}
      >
        {isFailed ? (
          <AlertTriangle size={10} className="text-red-500" />
        ) : isRunning ? (
          <Loader2 size={10} className="text-amber-500 animate-spin" />
        ) : (
          <CheckCircle2Small />
        )}
        <span className="font-medium">{proj.label || proj.active_label || toolCall.name || 'tool'}</span>
        {!hideDetails && <span className="text-muted-foreground">▾</span>}
      </button>
      {expanded && !hideDetails && (
        <div className="mt-1 pl-3 border-l-2 border-border space-y-1">
          {toolCall.arguments_string && (
            <div>
              <p className="font-semibold text-muted-foreground">Parameters:</p>
              <pre className="overflow-x-auto bg-muted/50 rounded p-1 text-[9px]">{toolCall.arguments_string}</pre>
            </div>
          )}
          {toolCall.results && (
            <div>
              <p className={`font-semibold ${isFailed ? 'text-red-500' : 'text-muted-foreground'}`}>Result:</p>
              <pre className="overflow-x-auto bg-muted/50 rounded p-1 text-[9px]">{typeof toolCall.results === 'string' ? toolCall.results : JSON.stringify(toolCall.results, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckCircle2Small() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

export default function TroubleshootWidget({ initialOpen = false }) {
  const [open, setOpen] = useState(initialOpen);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const initConversation = useCallback(async () => {
    if (conversation) return conversation;
    try {
      const convos = await base44.agents.listConversations({ agent_name: 'tech_support' });
      if (convos && convos.length > 0) {
        const conv = convos[0];
        setConversation(conv);
        setMessages(conv.messages || []);
        return conv;
      }
      const conv = base44.agents.createConversation({
        agent_name: 'tech_support',
        metadata: { name: 'GO Fix-It', description: '24/7 troubleshooting assistant' },
      });
      setConversation(conv);
      setMessages([]);
      return conv;
    } catch (err) {
      console.error('Troubleshoot init failed:', err);
      return null;
    }
  }, [conversation]);

  useEffect(() => {
    if (!open || conversation) return;
    setLoading(true);
    initConversation().finally(() => setLoading(false));
  }, [open, conversation, initConversation]);

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
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open GO Fix-It troubleshooter"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
          className="fixed md:!bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-amber-500 text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <Wrench size={24} />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-[10px] flex items-center justify-center text-white font-bold animate-pulse">
            <Zap size={10} />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm bg-card border rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b bg-amber-500 text-white rounded-t-2xl">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Wrench size={16} />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-sm">GO Fix-It</p>
              <p className="text-[10px] opacity-90 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                24/7 Troubleshooting Assistant
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close troubleshooter"
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: '200px' }}>
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-muted-foreground" size={20} />
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="text-center py-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Wrench size={24} className="text-amber-500" />
                </div>
                <p className="font-medium text-sm mb-1">Having trouble? I'm here 24/7</p>
                <p className="text-muted-foreground text-xs mb-4">Tell me what went wrong and I'll help you fix it. Pick a common issue below:</p>
                <div className="space-y-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.label}
                      onClick={() => handleSend(prompt.text)}
                      disabled={sending}
                      className="w-full text-left p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-xs disabled:opacity-50 flex items-center gap-2"
                    >
                      <prompt.icon size={14} className="text-amber-500 shrink-0" />
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${isUser ? 'bg-amber-500 text-white' : 'bg-muted'}`}>
                    {msg.content && (isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ))}
                    {msg.tool_calls?.map((tc, idx) => <ToolCallBadge key={idx} toolCall={tc} />)}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-3 py-2">
                  <Loader2 size={14} className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer link + Input */}
          <div className="border-t p-2">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Describe the issue..."
                disabled={sending}
                className="flex-1 h-9"
                aria-label="Describe your issue"
              />
              <Button
                onClick={() => handleSend()}
                disabled={sending || !input.trim()}
                size="icon"
                className="shrink-0 h-9 w-9 bg-amber-500 hover:bg-amber-600"
                aria-label="Send message"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <p className="text-[9px] text-muted-foreground">Can't fix it here?</p>
              <Link to="/support" className="text-[9px] text-primary hover:underline">Contact Support →</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}