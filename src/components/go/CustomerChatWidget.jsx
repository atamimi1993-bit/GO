import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  'How much does a move cost?',
  'How do I book a move?',
  'What size truck do I need?',
  'Do you offer storage?',
];

export default function CustomerChatWidget() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const initConversation = useCallback(async () => {
    if (conversation) return conversation;
    try {
      const convos = await base44.agents.listConversations({ agent_name: 'go_support' });
      if (convos && convos.length > 0) {
        const conv = convos[0];
        setConversation(conv);
        setMessages(conv.messages || []);
        return conv;
      }
      const conv = base44.agents.createConversation({
        agent_name: 'go_support',
        metadata: { name: 'GO Support', description: 'Customer support chat' },
      });
      setConversation(conv);
      setMessages([]);
      return conv;
    } catch (err) {
      console.error('Chat init failed:', err);
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
          aria-label="Open GO Assistant"
          className="fixed bottom-20 md:bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        >
          <MessageSquare size={24} />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-[10px] flex items-center justify-center text-white font-bold">
            <Sparkles size={10} />
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm bg-card border rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b bg-primary text-primary-foreground rounded-t-2xl">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-sm">GO Assistant</p>
              <p className="text-[10px] opacity-80">Instant estimates & booking help</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="w-8 h-8 rounded-full hover:bg-primary-foreground/10 flex items-center justify-center"
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
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={24} className="text-primary" />
                </div>
                <p className="font-medium text-sm mb-1">Hi! I'm your GO Assistant</p>
                <p className="text-muted-foreground text-xs mb-4">Ask me about pricing, booking, or anything GO-related.</p>
                <div className="space-y-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      disabled={sending}
                      className="w-full text-left p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-xs disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.content && (isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ))}
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

          {/* Input */}
          <div className="border-t p-2 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message..."
              disabled={sending}
              className="flex-1 h-9"
            />
            <Button
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              size="icon"
              className="shrink-0 h-9 w-9"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}