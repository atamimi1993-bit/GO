import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import MessageBubble from '@/components/go/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Plus, MessageSquare, Loader2, Bot } from 'lucide-react';
import PullToRefresh from '@/components/go/PullToRefresh';

const AGENT_NAME = 'go_support';

export default function Support() {
  const { scrollRef } = useOutletContext();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const chatEndRef = useRef(null);
  const listRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
    } catch {
      setConversations([]);
    }
    setLoadingList(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [activeId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = async () => {
    setCreating(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: 'New Conversation', description: 'Support chat' },
      });
      setConversations(prev => [conv, ...(prev || [])]);
      setActiveId(conv.id);
      setMobileView('chat');
      setMessages(conv.messages || []);
    } catch { /* ignore */ }
    setCreating(false);
  };

  const handleSelect = (conv) => {
    setActiveId(conv.id);
    setMobileView('chat');
    setMessages(conv.messages || []);
  };

  const handleBackToList = () => {
    setMobileView('list');
    setActiveId(null);
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');

    if (!activeId) {
      setCreating(true);
      try {
        const conv = await base44.agents.createConversation({
          agent_name: AGENT_NAME,
          metadata: { name: text.slice(0, 40), description: 'Support chat' },
        });
        setConversations(prev => [conv, ...(prev || [])]);
        setActiveId(conv.id);
        setMobileView('chat');
        await base44.agents.addMessage(conv, { role: 'user', content: text });
      } catch { setInput(text); }
      setCreating(false);
      return;
    }

    const conv = conversations.find(c => c.id === activeId) || { id: activeId };
    setSending(true);
    try {
      await base44.agents.addMessage(conv, { role: 'user', content: text });
    } catch { setInput(text); }
    setSending(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-emerald-500 rounded-xl p-2 flex items-center justify-center">
          <Bot className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">GO Assistant</h1>
          <p className="text-muted-foreground text-sm">Ask about your moves, pricing, storage, or driver questions.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversation list */}
        <div ref={listRef} className={`${mobileView === 'list' ? 'flex' : 'hidden'} sm:flex w-full sm:w-56 shrink-0 overflow-y-auto border-r border-border pr-2 space-y-1 flex-col`}>
          <PullToRefresh onRefresh={loadConversations} scrollRef={scrollRef}>
          <Button variant="outline" size="sm" className="w-full mb-2" onClick={handleNewChat} disabled={creating}>
            {creating ? <Loader2 size={14} className="animate-spin mr-1" /> : <Plus size={14} className="mr-1" />} New Chat
          </Button>
          {loadingList ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={20} /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors min-h-[44px] ${activeId === c.id ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'hover:bg-muted text-muted-foreground'}`}
              >
                <MessageSquare size={14} className="shrink-0" />
                <span className="truncate">{c.metadata?.name || 'Conversation'}</span>
              </button>
            ))
          )}
          </PullToRefresh>
        </div>

        {/* Chat area */}
        <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} sm:flex flex-1 flex-col min-h-0 bg-card border rounded-2xl overflow-hidden`}>
          {!activeId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="text-emerald-600 dark:text-emerald-400" size={32} />
              </div>
              <h2 className="text-lg font-display font-bold mb-1">How can I help you?</h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">Ask me anything about booking a move, checking your move status, storage options, or driver questions.</p>
              <Button onClick={handleNewChat} disabled={creating} className="bg-emerald-500 hover:bg-emerald-600">
                {creating ? <Loader2 size={16} className="animate-spin mr-1" /> : <Plus size={16} className="mr-1" />} Start a Conversation
              </Button>
            </div>
          ) : (
            <>
              <div className="sm:hidden flex items-center gap-2 px-3 py-2 border-b border-border">
                <button onClick={handleBackToList} aria-label="Back to conversations" className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <ArrowLeft size={20} />
                </button>
                <span className="text-sm font-medium">Conversations</span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Bot className="text-muted-foreground mb-3" size={28} />
                    <p className="text-sm text-muted-foreground">Send a message to get started</p>
                  </div>
                ) : (
                  <>
                    {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>
              <div className="border-t border-border p-3 flex items-center gap-2">
                <label htmlFor="chat-input" className="sr-only">Type your message</label>
                <Input
                  id="chat-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Type your message..."
                  disabled={sending || creating}
                  className="flex-1"
                  aria-label="Type your message"
                />
                <span aria-live="polite" className="sr-only">{sending ? 'Sending message...' : ''}</span>
                <Button onClick={handleSend} disabled={sending || creating || !input.trim()} className="bg-emerald-500 hover:bg-emerald-600" size="icon" aria-label="Send message">
                  {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}