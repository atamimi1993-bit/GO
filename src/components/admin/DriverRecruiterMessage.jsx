import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ShieldCheck, Bot, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex gap-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-primary' : 'bg-blue-500/10'}`}>
          {isUser ? <ShieldCheck size={16} className="text-primary-foreground" /> : <Bot size={16} className="text-blue-600" />}
        </div>
        <div className={`rounded-2xl px-4 py-2.5 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-background border'}`}>
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
  const status = (tc) => {
    if (['failed', 'error'].includes(tc.status)) return { icon: AlertTriangle, color: 'text-red-500', label: 'Failed' };
    if (['completed', 'success'].includes(tc.status)) return { icon: CheckCircle2, color: 'text-blue-500', label: 'Done' };
    return { icon: Loader2, color: 'text-amber-500', label: 'Running' };
  };
  const s = status(toolCall);
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
  const isFailed = ['failed', 'error'].includes(toolCall.status)
    || (parsedResult && typeof parsedResult === 'object' && parsedResult.success === false)
    || (typeof toolCall.results === 'string' && /error|failed/i.test(toolCall.results));

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
              <p className={`font-semibold ${isFailed ? 'text-red-500' : 'text-muted-foreground'}`}>Result:</p>
              <pre className="text-[10px] overflow-x-auto bg-muted/50 rounded p-1.5">{typeof toolCall.results === 'string' ? toolCall.results : JSON.stringify(toolCall.results, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}