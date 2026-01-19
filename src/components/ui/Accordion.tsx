// ============================================
// Accordion Component
// ============================================

import { createContext, useContext, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils';

// Accordion Context
interface AccordionContextValue {
  openItems: string[];
  toggleItem: (value: string) => void;
  type: 'single' | 'multiple';
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
}

// Accordion Root
export interface AccordionProps {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  children: ReactNode;
  className?: string;
  onValueChange?: (value: string | string[] | undefined) => void;
}

export function Accordion({ 
  type = 'single', 
  defaultValue,
  children, 
  className,
  onValueChange
}: AccordionProps) {
  const [openItems, setOpenItems] = useState<string[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });
  
  const toggleItem = (value: string) => {
    setOpenItems((prev) => {
      const newItems = type === 'single'
        ? (prev.includes(value) ? [] : [value])
        : (prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value]);
      
      // Call onValueChange callback if provided
      if (onValueChange) {
        if (type === 'single') {
          onValueChange(newItems.length > 0 ? newItems[0] : undefined);
        } else {
          onValueChange(newItems);
        }
      }
      
      return newItems;
    });
  };
  
  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, type }}>
      <div className={cn('accordion', className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

// Accordion Item
export interface AccordionItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function AccordionItem({ value, children, className }: AccordionItemProps) {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.includes(value);
  
  return (
    <div 
      className={cn('accordion-item', isOpen && 'accordion-item-open', className)}
      data-state={isOpen ? 'open' : 'closed'}
    >
      {children}
    </div>
  );
}

// Accordion Trigger
export interface AccordionTriggerProps {
  children: ReactNode;
  className?: string;
  value: string;
}

export function AccordionTrigger({ children, className, value }: AccordionTriggerProps) {
  const { openItems, toggleItem } = useAccordionContext();
  const isOpen = openItems.includes(value);
  
  return (
    <button
      type="button"
      className={cn('accordion-trigger', className)}
      onClick={() => toggleItem(value)}
      aria-expanded={isOpen}
    >
      {children}
      <ChevronDown 
        className={cn('accordion-chevron', isOpen && 'accordion-chevron-open')} 
      />
    </button>
  );
}

// Accordion Content
export interface AccordionContentProps {
  children: ReactNode;
  className?: string;
  value: string;
}

export function AccordionContent({ children, className, value }: AccordionContentProps) {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.includes(value);
  
  if (!isOpen) return null;
  
  return (
    <div className={cn('accordion-content', className)}>
      <div className="accordion-content-inner">
        {children}
      </div>
    </div>
  );
}
