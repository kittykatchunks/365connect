// ============================================
// Main Panel - Contains tabs and content views
// ============================================

import { type ReactNode } from 'react';
import { cn } from '@/utils';

interface MainPanelProps {
  children: ReactNode;
  className?: string;
}

export function MainPanel({ children, className }: MainPanelProps) {
  return (
    <div className={cn('main-panel', className)}>
      {children}
    </div>
  );
}

interface MainPanelHeaderProps {
  children: ReactNode;
  className?: string;
}

export function MainPanelHeader({ children, className }: MainPanelHeaderProps) {
  return (
    <div className={cn('main-panel-header', className)}>
      {children}
    </div>
  );
}

interface MainPanelContentProps {
  children: ReactNode;
  className?: string;
}

export function MainPanelContent({ children, className }: MainPanelContentProps) {
  return (
    <div className={cn('main-panel-content', className)}>
      {children}
    </div>
  );
}
