import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PageHeader({ title, isRoot = false, onBack }) {
  const navigate = useNavigate();

  if (isRoot) {
    return <h1 className="text-2xl font-display font-bold">{title}</h1>;
  }

  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={() => (onBack ? onBack() : navigate(-1))}
        aria-label="Go back"
        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-2xl font-display font-bold">{title}</h1>
    </div>
  );
}