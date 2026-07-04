import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, Loader2 } from 'lucide-react';

export default function MoveChat({ move, currentUser, driverProfile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const isDriver = driverProfile?.id && driverProfile.id === move.assigned_driver_id;
  const senderRole = isDriver ? 'driver' : 'customer';
  const senderName = isDriver
    ? driverProfile.full_name
    : move.customer_name || currentUser?.full_name || currentUser?.email || 'Customer';

  const loadMessages = async () => {
    try {
      const msgs = await base44.entities.Message.filter(
        { move_request_id: move.id },
        'created_date',
        100
      );
      setMessages(msgs);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.move_request_id === move.id) {
        loadMessages();
      }
    });
    return unsubscribe;
  }, [move.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !currentUser || sending) return;
    // Optimistic message — shown immediately, replaced when the subscription fires
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      _pending: true,
      move_request_id: move.id,
      sender_id: currentUser.id,
      sender_name: senderName,
      sender_role: senderRole,
      content: text,
    }]);
    setInput('');
    setSending(true);
    try {
      await base44.entities.Message.create({
        move_request_id: move.id,
        sender_id: currentUser.id,
        sender_name: senderName,
        sender_role: senderRole,
        content: text,
      });
      // The subscription will replace the optimistic message with the real one
    } catch {
      // Remove the optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 mt-4 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle size={18} className="text-emerald-500" />
        <h3 className="font-display font-bold text-sm">Messages</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {isDriver ? 'You (Driver)' : move.assigned_driver_name || 'Driver'}
        </span>
      </div>

      <div ref={scrollRef} className="max-h-80 overflow-y-auto space-y-2 mb-3 min-h-[100px]">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                    isMe
                      ? 'bg-emerald-500 text-white rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-medium mb-0.5 opacity-70">
                      {msg.sender_name} · {msg.sender_role}
                    </p>
                  )}
                  <p className={`text-sm select-text ${msg._pending ? 'opacity-60' : ''}`}>{msg.content}</p>
                  {msg._pending && (
                    <p className="text-[10px] opacity-50 mt-0.5">Sending...</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </form>
    </div>
  );
}