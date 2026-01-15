// ============================================
// Panel Header - Header for content panels
// ============================================

import { type ReactNode } from 'react';
import { cn } from '@/utils';

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, subtitle, actions, className }: PanelHeaderProps) {
  return (
    <div className={cn('panel-header', className)}>
      <div className="panel-header-text">
        <h1 className="panel-header-title">{title}</h1>
        {subtitle && <p className="panel-header-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="panel-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
