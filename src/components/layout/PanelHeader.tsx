// ============================================
// Panel Header - Header for content panels
// ============================================

import { cn } from '@/utils';

interface PanelHeaderProps {
  title: string;
  subtitle?: string | React.ReactNode;
  subtitleClassName?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ title, subtitle, subtitleClassName, actions, className }: PanelHeaderProps) {
  return (
    <div className={cn('panel-header', className)}>
      <div className="panel-header-text">
        <h1 className="panel-header-title">{title}</h1>
        {subtitle && <div className={cn('panel-header-subtitle', subtitleClassName)}>{subtitle}</div>}
      </div>
      {actions && (
        <div className="panel-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
