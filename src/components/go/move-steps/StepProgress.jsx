import React from 'react';

export default function StepProgress({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 shrink-0 ${i <= currentStep ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i < currentStep
                ? 'bg-emerald-500 text-white'
                : i === currentStep
                  ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                  : 'bg-muted'
            }`}>
              {i + 1}
            </div>
            <span className="text-xs font-medium whitespace-nowrap">{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 min-w-[12px] h-0.5 ${i < currentStep ? 'bg-emerald-500' : 'bg-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}