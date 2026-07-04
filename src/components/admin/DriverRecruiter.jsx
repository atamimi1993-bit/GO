import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { MessageBubble } from '@/components/admin/DriverRecruiterMessage';
import SectionSkeleton from '@/components/admin/SectionSkeleton';
import { Bot, Send, Loader2, RefreshCw, Copy, FileText, UserPlus, Share2, Megaphone } from 'lucide-react';

const QUICK_PROMPTS = [
  'Find the best websites and job boards where truck drivers look for work in 2026',
  'Generate a job posting for Indeed to recruit box truck drivers',
  'Write a Facebook post to attract drivers to the GO platform',
  'Draft an outreach message I can send to drivers on trucker forums',
  'Create a multi-channel driver recruitment strategy',
];

const CONTENT_TYPE_ICONS = {
  job_posting: FileText,
  outreach_message: UserPlus,
  social_post: Share2,
  recruitment_strategy: Megaphone,
};

export default function DriverRecruiter() {
  const { toast } = useToast();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const messagesEndRef = useRef(null);

  const loadConversation = useCallback(async () => {
    try {
      const convos = await base44.agents.listConversations({ agent_name: 'driver_recruiter' });
      if (convos && convos.length > 0) {
        const conv = convos[0];
        setConversation(conv);
        setMessages(conv.messages || []);
      } else {
        const conv = base44.agents.createConversation({
          agent_name: 'driver_recruiter',
          metadata: { name: 'Driver Recruiter', description: 'AI driver recruitment assistant' },
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

  const loadPosts = useCallback(async () => {
    try {
      const data = await base44.entities.RecruitmentPost.list('-created_date', 20);
      setPosts(data);
    } catch {
      setPosts([]);
    }
  }, []);

  useEffect(() => {
    loadConversation();
    loadPosts();
  }, [loadConversation, loadPosts]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      const newMessages = data.messages || [];
      setMessages(newMessages);
      const lastMsg = newMessages[newMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.tool_calls?.some(tc => ['completed', 'success'].includes(tc.status))) {
        loadPosts();
      }
    });
    return () => unsubscribe();
  }, [conversation?.id, loadPosts]);

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

  if (loading) {
    return <SectionSkeleton />;
  }

  return (
    <div className="bg-card border rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-500 rounded-xl p-2.5 flex items-center justify-center">
          <Bot className="text-white" size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-display font-bold text-lg">AI Driver Recruiter</h2>
          <p className="text-muted-foreground text-sm">Find driver job boards, generate postings, and create outreach content.</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => { loadConversation(); loadPosts(); }} title="Refresh" aria-label="Refresh conversation and posts">
          <RefreshCw size={18} />
        </Button>
      </div>

      <div className="max-h-[400px] overflow-y-auto mb-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
              <Bot size={28} className="text-blue-600" />
            </div>
            <h3 className="font-display font-bold mb-1">Driver Recruiter Ready</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">Ask me to find driver job boards, generate postings, or create recruitment content.</p>
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
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-blue-600" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-background border">
                <Loader2 size={16} className="animate-spin text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t pt-3 mb-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask the recruiter to find platforms or generate content..."
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={() => handleSend()} disabled={sending || !input.trim()} size="icon" className="shrink-0 bg-blue-500 hover:bg-blue-600" aria-label="Send message">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </div>

      {posts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm">Generated Recruitment Content</h3>
            <span className="text-xs text-muted-foreground">{posts.length} saved</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {posts.map((post) => {
              const Icon = CONTENT_TYPE_ICONS[post.content_type] || FileText;
              return (
                <div key={post.id} className="border rounded-xl p-3 bg-background">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={14} className="text-blue-500 shrink-0" />
                      <span className="text-sm font-medium truncate">{post.title}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{post.content_type?.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{post.content}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{post.target_platform || 'general'}</span>
                    <Button size="sm" variant="ghost" onClick={() => handleCopy(post.content)} className="h-7 px-2 text-xs">
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