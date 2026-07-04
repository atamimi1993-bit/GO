import { Thermometer, PenLine, Snowflake } from 'lucide-react';

export default function TemperatureBadge({ show, small }) {
  if (!show) return null;
  const size = small ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 text-xs font-medium">
      <Snowflake size={small ? 10 : 12} /> Temp-controlled
    </span>
  );
}

export function SignatureBadge({ show, small }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 text-xs font-medium">
      <PenLine size={small ? 10 : 12} /> Sig. required
    </span>
  );
}