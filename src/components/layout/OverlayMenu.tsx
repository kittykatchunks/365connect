// ============================================
// Overlay Menu - Left-side sliding menu for navigation
// ============================================

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Phone, 
  Users, 
  History, 
  Building2, 
  BarChart3, 
  Settings,
  BookOpen,
  Pin,
  PinOff,
  X
} from 'lucide-react';
import { cn, isVerboseLoggingEnabled } from '@/utils';
import { useAppStore, useSettingsStore } from '@/stores';
import { useTabNotification } from '@/hooks';
import { ThemeToggle } from './ThemeToggle';
import type { ViewType } from '@/types';

interface MenuItem {
  id: ViewType;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  settingKey?: keyof AppSettings['interface'];
  alwaysVisible?: boolean;
}

interface AppSettings {
  interface: {
    showContactsTab: boolean;
    showActivityTab: boolean;
    showCompanyNumbersTab: boolean;
    showQueueMonitorTab: boolean;
  };
}

interface OverlayMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// Main navigation items (top section)
const menuItems: MenuItem[] = [
  { id: 'dial', labelKey: 'menu.phone', icon: Phone, alwaysVisible: true },
  { id: 'activity', labelKey: 'menu.activity', icon: History, settingKey: 'showActivityTab' },
  { id: 'contacts', labelKey: 'menu.contacts', icon: Users, settingKey: 'showContactsTab' },
  { id: 'companyNumbers', labelKey: 'menu.company_numbers', icon: Building2, settingKey: 'showCompanyNumbersTab' },
  { id: 'queueMonitor', labelKey: 'menu.queue_monitor', icon: BarChart3, settingKey: 'showQueueMonitorTab' },
];

export function OverlayMenu({ isOpen, onClose }: OverlayMenuProps) {
  const { t } = useTranslation();
  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const settings = useSettingsStore((state) => state.settings);
  const { getTabAlertClass } = useTabNotification();
  const [isPinned, setIsPinned] = useState(() => {
    // Load pinned state from localStorage
    return localStorage.getItem('overlayMenuPinned') === 'true';
  });
  
  const verboseLogging = isVerboseLoggingEnabled();
  
  // Filter visible menu items based on settings
  const visibleItems = menuItems.filter((item) => {
    // Always visible items (Phone)
    if (item.alwaysVisible) return true;
    // Check setting for visibility
    if (!item.settingKey) return false;
    return settings.interface[item.settingKey as keyof typeof settings.interface];
  });
  
  // Handle pin toggle
  const handleTogglePin = () => {
    const newPinState = !isPinned;
    setIsPinned(newPinState);
    localStorage.setItem('overlayMenuPinned', String(newPinState));
    
    if (verboseLogging) {
      console.log(`[OverlayMenu] 📌 Menu ${newPinState ? 'pinned' : 'unpinned'}`);
    }
  };
  
  // Handle menu item click
  const handleItemClick = (viewId: ViewType) => {
    if (verboseLogging) {
      console.log(`[OverlayMenu] 🧭 Navigating to view: ${viewId}`);
    }
    
    setCurrentView(viewId);
    
    // Close menu if not pinned
    if (!isPinned) {
      onClose();
    }
  };
  
  // Handle settings click
  const handleSettingsClick = () => {
    if (verboseLogging) {
      console.log('[OverlayMenu] ⚙️ Opening settings');
    }
    
    setCurrentView('settings');
    
    if (!isPinned) {
      onClose();
    }
  };
  
  // Handle user guide click
  const handleUserGuideClick = () => {
    if (verboseLogging) {
      console.log('[OverlayMenu] 📖 Opening user guide');
    }
    
    const currentLang = settings.interface.language;
    window.open(`/userguide/index.html?lang=${currentLang}`, '_blank', 'width=1000,height=800,noopener,noreferrer');
  };
  
  // Close menu on escape key (if not pinned)
  useEffect(() => {
    if (!isOpen || isPinned) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isPinned, onClose]);
  
  // Handle click outside to close (if not pinned)
  useEffect(() => {
    if (!isOpen || isPinned) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.overlay-menu') && !target.closest('.app-brand')) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isPinned, onClose]);
  
  return (
    <>
      {/* Backdrop (only show when open and not pinned) */}
      {isOpen && !isPinned && (
        <div className="overlay-menu-backdrop" onClick={onClose} />
      )}
      
      {/* Menu */}
      <aside 
        className={cn(
          'overlay-menu',
          isOpen && 'overlay-menu-open',
          isPinned && 'overlay-menu-pinned'
        )}
        aria-label={t('menu.navigation', 'Navigation menu')}
      >
        {/* Header with pin/close buttons */}
        <div className="overlay-menu-header">
          <div className="overlay-menu-brand">
            <img src="/icons/pwa-192x192.png" alt="" className="overlay-menu-logo" />
            <span className="overlay-menu-title">Connect365</span>
          </div>
          
          <div className="overlay-menu-controls">
            <button
              className="overlay-menu-control-btn"
              onClick={handleTogglePin}
              title={isPinned ? t('menu.unpin', 'Unpin menu') : t('menu.pin', 'Pin menu')}
              aria-label={isPinned ? t('menu.unpin', 'Unpin menu') : t('menu.pin', 'Pin menu')}
            >
              {isPinned ? <PinOff size={18} /> : <Pin size={18} />}
            </button>
            
            {!isPinned && (
              <button
                className="overlay-menu-control-btn"
                onClick={onClose}
                title={t('menu.close', 'Close menu')}
                aria-label={t('menu.close', 'Close menu')}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        
        {/* Main navigation items */}
        <nav className="overlay-menu-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const alertClass = getTabAlertClass(item.id);
            
            return (
              <button
                key={item.id}
                className={cn(
                  'overlay-menu-item',
                  isActive && 'overlay-menu-item-active',
                  alertClass
                )}
                onClick={() => handleItemClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="overlay-menu-item-icon" />
                <span className="overlay-menu-item-label">{t(item.labelKey, item.id)}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Bottom actions */}
        <div className="overlay-menu-actions">
          {/* Theme toggle */}
          <ThemeToggle />
          
          {/* User Guide */}
          <button
            className="overlay-menu-action-btn"
            onClick={handleUserGuideClick}
            title={t('menu.user_guide', 'User Guide')}
          >
            <BookOpen className="overlay-menu-action-icon" />
            <span className="overlay-menu-action-label">{t('menu.user_guide', 'User Guide')}</span>
          </button>
          
          {/* Settings */}
          <button
            className={cn(
              'overlay-menu-action-btn',
              currentView === 'settings' && 'overlay-menu-action-btn-active'
            )}
            onClick={handleSettingsClick}
            title={t('menu.settings', 'Settings')}
          >
            <Settings className="overlay-menu-action-icon" />
            <span className="overlay-menu-action-label">{t('menu.settings', 'Settings')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
