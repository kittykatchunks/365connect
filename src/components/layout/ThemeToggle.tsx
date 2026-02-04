// ============================================
// Theme Toggle - Theme switcher for overlay menu
// ============================================

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { isVerboseLoggingEnabled } from '@/utils';

type Theme = 'light' | 'dark' | 'auto';

const themeConfig = {
  light: {
    icon: Sun,
    labelKey: 'theme.light',
    defaultLabel: 'Light',
  },
  dark: {
    icon: Moon,
    labelKey: 'theme.dark',
    defaultLabel: 'Dark',
  },
  auto: {
    icon: Monitor,
    labelKey: 'theme.auto',
    defaultLabel: 'Auto',
  },
};

export function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.settings.interface.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const verboseLogging = isVerboseLoggingEnabled();
  
  const handleThemeChange = () => {
    // Cycle through themes: light -> dark -> auto -> light
    const themeOrder: Theme[] = ['light', 'dark', 'auto'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    const nextTheme = themeOrder[nextIndex];
    
    if (verboseLogging) {
      console.log(`[ThemeToggle] 🎨 Switching theme from ${theme} to ${nextTheme}`);
    }
    
    setTheme(nextTheme);
  };
  
  const config = themeConfig[theme];
  const Icon = config.icon;
  
  return (
    <button
      className="overlay-menu-action-btn theme-toggle"
      onClick={handleThemeChange}
      title={t('menu.theme_toggle', 'Toggle theme')}
      aria-label={t('menu.theme_toggle', 'Toggle theme')}
    >
      <Icon className="overlay-menu-action-icon" />
      <span className="overlay-menu-action-label">
        {t(config.labelKey, config.defaultLabel)}
      </span>
    </button>
  );
}
