import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Wrench } from 'lucide-react';

function formatName(name) {
  if (!name) return 'Tool';
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status;
  const isPending = ['pending', 'running', 'in_progress'].includes(status);
  const isFailed = ['failed', 'error'].includes(status);

  let parsedResults = toolCall.results;
  if (typeof parsedResults === 'string') {
    try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
  }
  const failedResult = typeof parsedResults === 'object' && parsedResults !== null && parsedResults.success === false;

  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;

  const label = isFailed ? (proj.error_label || 'Failed') : isPending ? (proj.active_label || 'Running') : (proj.label || 'Done');

  if (hideDetails) {
    return (
      <div className="mt-2 text-xs flex items-center gap-1.5 text-muted-foreground">
        {isPending ? <Loader2 size={12} className="animate-spin" /> : isFailed ? <XCircle size={12} className="text-destructive" /> : <CheckCircle2 size={12} className="text-emerald-500" />}
        {label}
      </div>
    );
  }

  let parsedArgs = toolCall.arguments_string;
  if (typeof parsedArgs === 'string') {
    try { parsedArgs = JSON.parse(parsedArgs); } catch { /* keep raw */ }
  }

  return (
    <div className="mt-2 text-xs border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 w-full px-2.5 py-1.5 hover:bg-muted transition-colors text-left"
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : isFailed ? <XCircle size={12} className="text-destructive" /> : <CheckCircle2 size={12} className="text-emerald-500" />}
        <Wrench size={12} className="text-muted-foreground" />
        <span className="font-medium">{formatName(toolCall.name)}</span>
        <span className={`ml-auto ${isFailed ? 'text-destructive' : 'text-muted-foreground'}`}>{label}</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {expanded && (
        <div className="px-2.5 py-2 border-t border-border space-y-2 bg-muted/30">
          {parsedArgs !== undefined && (
            <div>
              <p className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Parameters</p>
              <pre className="text-[11px] whitespace-pre-wrap break-all font-mono">{typeof parsedArgs === 'string' ? parsedArgs : JSON.stringify(parsedArgs, null, 2)}</pre>
            </div>
          )}
          {parsedResults !== undefined && !failedResult && (
            <div>
              <p className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Result</p>
              <pre className="text-[11px] whitespace-pre-wrap break-all font-mono">{typeof parsedResults === 'string' ? parsedResults : JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : ''}`}>
        {message.content && (
          isUser ? (
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3.5 py-2 text-sm">
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          ) : (
            <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2 text-sm">
              <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-0 prose-ul:my-0 prose-li:my-0">{message.content}</ReactMarkdown>
            </div>
          )
        )}
        {message.tool_calls?.map((tc, i) => <FunctionDisplay key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}