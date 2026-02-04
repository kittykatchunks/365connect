// ============================================
// Main Panel - Contains tabs and content views
// ============================================

import { type ReactNode, type CSSProperties, type MouseEvent } from 'react';
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
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  style?: CSSProperties;
}

export function MainPanelHeader({ children, className, onClick, style }: MainPanelHeaderProps) {
  return (
    <div 
      className={cn('main-panel-header', className)}
      onClick={onClick}
      style={style}
    >
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
