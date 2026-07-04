import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Check, ChevronDown } from 'lucide-react';

export default function MobileSelect({ value, onValueChange, options, placeholder, className }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedOption = options?.find(o => o.value === value);
  const selectedLabel = selectedOption?.label || placeholder || 'Select';

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>
          {options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className={`flex h-9 min-h-[44px] w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
        >
          <span className={value ? '' : 'text-muted-foreground'}>{selectedLabel}</span>
          <ChevronDown size={16} className="opacity-50" />
        </button>
      </DrawerTrigger>
      <DrawerContent aria-modal="true">
        <DrawerHeader>
          <DrawerTitle>{placeholder || 'Select an option'}</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto max-h-[50vh] pb-4">
          {options?.map((o, i) => (
            <button
              key={o.value}
              type="button"
              autoFocus={i === 0}
              onClick={() => { onValueChange(o.value); setOpen(false); }}
              className="flex w-full items-center justify-between min-h-[44px] px-4 py-3 text-sm hover:bg-accent transition-colors text-left"
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={16} className="text-primary" />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}