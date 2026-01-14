// ============================================
// Main Container - App Shell Layout
// ============================================

import { type ReactNode } from 'react';
import { cn } from '@/utils';

interface MainContainerProps {
  children: ReactNode;
  className?: string;
}

export function MainContainer({ children, className }: MainContainerProps) {
  return (
    <div className={cn('main-container', className)}>
      {children}
    </div>
  );
}

interface MainContentProps {
  children: ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main className={cn('main-content', className)}>
      {children}
    </main>
  );
}
