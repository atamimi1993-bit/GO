import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Lightbulb, Send, Loader2, CheckCircle2 } from 'lucide-react';

export default function SuggestionBox({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('idea');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), body: body.trim(), type });
      setSubmitted(true);
      setTitle('');
      setBody('');
      setType('idea');
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      // parent handles toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={18} className="text-amber-500" />
        <h3 className="font-display font-bold text-sm">Suggest an Idea or Update</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Have an idea for improving the platform or an update the Overseer AI should know about? Submit it here.
      </p>

      {submitted ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Suggestion submitted to the Overseer AI!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('idea')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                type === 'idea'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
                  : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              💡 Idea
            </button>
            <button
              type="button"
              onClick={() => setType('update')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                type === 'update'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
                  : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              🔄 Update
            </button>
          </div>
          <Input
            placeholder="Short title — e.g. 'Auto-archive completed moves after 30 days'"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <Textarea
            placeholder="Describe your idea or update in detail..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={1000}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{body.length}/1000</span>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || !body.trim() || submitting}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="mr-1" />}
              Submit to Overseer
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}