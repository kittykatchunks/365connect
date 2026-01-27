// ============================================
// Navigation Tabs - Tab bar for switching views
// ============================================

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { 
  Phone, 
  Users, 
  History, 
  Building2, 
  BarChart3, 
  Settings 
} from 'lucide-react';
import { cn, isVerboseLoggingEnabled } from '@/utils';
import { useAppStore } from '@/stores';
import { useSettingsStore } from '@/stores';
import { useTabNotification } from '@/hooks';
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
  const { getTabAlertClass } = useTabNotification();
  
  const visibleTabs = tabs.filter((tab) => {
    // Dial and Settings are always visible
    if (!tab.settingKey) return true;
    // Check setting for visibility
    return settings.interface[tab.settingKey as keyof typeof settings.interface];
  });
  
  // Apply dynamic min-width based on visible tab count
  useEffect(() => {
    const verboseLogging = isVerboseLoggingEnabled();
    const tabCount = visibleTabs.length;
    let minWidth: string;
    
    // Determine min-width based on tab count
    if (tabCount >= 2 && tabCount <= 4) {
      minWidth = '300px';
    } else if (tabCount === 5) {
      minWidth = '315px';
    } else if (tabCount >= 6) {
      minWidth = '365px';
    } else {
      minWidth = '300px'; // Default fallback
    }
    
    if (verboseLogging) {
      console.log(`[NavigationTabs] 📐 Setting app min-width to ${minWidth} for ${tabCount} visible tabs`);
    }
    
    // Apply min-width to body element
    document.body.style.minWidth = minWidth;
    
    // Cleanup function to reset if component unmounts
    return () => {
      document.body.style.minWidth = '';
    };
  }, [visibleTabs.length]);
  
  return (
    <nav className="navigation-tabs" role="tablist">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id;
        const alertClass = getTabAlertClass(tab.id);
        
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            className={cn(
              'nav-tab',
              isActive && 'nav-tab-active',
              alertClass
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
