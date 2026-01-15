// ============================================
// Left Panel - Contains tabs and content views
// ============================================

import { type ReactNode } from 'react';
import { cn } from '@/utils';

interface LeftPanelProps {
  children: ReactNode;
  className?: string;
}

export function LeftPanel({ children, className }: LeftPanelProps) {
  return (
    <div className={cn('left-panel', className)}>
      {children}
    </div>
  );
}

interface LeftPanelHeaderProps {
  children: ReactNode;
  className?: string;
}

export function LeftPanelHeader({ children, className }: LeftPanelHeaderProps) {
  return (
    <div className={cn('left-panel-header', className)}>
      {children}
    </div>
  );
}

interface LeftPanelContentProps {
  children: ReactNode;
  className?: string;
}

export function LeftPanelContent({ children, className }: LeftPanelContentProps) {
  return (
    <div className={cn('left-panel-content', className)}>
      {children}
    </div>
  );
}
