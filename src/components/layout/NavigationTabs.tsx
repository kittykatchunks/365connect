// ============================================
// Navigation Tabs - Tab bar for switching views
// ============================================

import { useTranslation } from 'react-i18next';
import { 
  Phone, 
  Users, 
  History, 
  Building2, 
  BarChart3, 
  Settings 
} from 'lucide-react';
import { cn } from '@/utils';
import { useAppStore } from '@/stores';
import { useSettingsStore } from '@/stores';
import type { ViewType } from '@/types';

interface TabItem {
  id: ViewType;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  settingKey?: keyof AppSettings['interface'];
}

const tabs: TabItem[] = [
  { id: 'dial', labelKey: 'tabs.dial', icon: Phone },
  { id: 'contacts', labelKey: 'tabs.contacts', icon: Users, settingKey: 'showContactsTab' },
  { id: 'activity', labelKey: 'tabs.activity', icon: History, settingKey: 'showActivityTab' },
  { id: 'companyNumbers', labelKey: 'tabs.company_numbers', icon: Building2, settingKey: 'showCompanyNumbersTab' },
  { id: 'queueMonitor', labelKey: 'tabs.queue_monitor', icon: BarChart3, settingKey: 'showQueueMonitorTab' },
  { id: 'settings', labelKey: 'tabs.settings', icon: Settings },
];

interface AppSettings {
  interface: {
    showContactsTab: boolean;
    showActivityTab: boolean;
    showCompanyNumbersTab: boolean;
    showQueueMonitorTab: boolean;
  };
}

export function NavigationTabs() {
  const { t } = useTranslation();
  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const settings = useSettingsStore((state) => state.settings);
  
  const visibleTabs = tabs.filter((tab) => {
    // Dial and Settings are always visible
    if (!tab.settingKey) return true;
    // Check setting for visibility
    return settings.interface[tab.settingKey as keyof typeof settings.interface];
  });
  
  return (
    <nav className="navigation-tabs" role="tablist">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id;
        
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            className={cn(
              'nav-tab',
              isActive && 'nav-tab-active'
            )}
            onClick={() => setCurrentView(tab.id)}
          >
            <Icon className="nav-tab-icon" />
            <span className="nav-tab-label">{t(tab.labelKey, tab.id)}</span>
          </button>
        );
      })}
    </nav>
  );
}
