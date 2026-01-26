// ============================================
// Main Entry Point
// ============================================

import { createRoot } from 'react-dom/client';
import App from './App';

// Initialize i18n before rendering
import './i18n';

// Handle click-to-dial tel: URLs
// Check if app was opened via tel: link and handle appropriately
function handleTelUrl() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const telNumber = urlParams.get('tel');
    
    if (telNumber) {
      const verboseLogging = localStorage.getItem('VerboseLogging') === 'true';
      
      if (verboseLogging) {
        console.log('[main.tsx] 📞 Detected tel: URL parameter:', telNumber);
      }
      
      // Check if click-to-dial is enabled in settings
      // We need to access the persisted settings from localStorage
      const settingsJson = localStorage.getItem('settings-store');
      let clickToDialEnabled = false;
      
      if (settingsJson) {
        try {
          const settingsData = JSON.parse(settingsJson);
          clickToDialEnabled = settingsData?.state?.settings?.call?.clickToDialEnabled ?? false;
          
          if (verboseLogging) {
            console.log('[main.tsx] Click-to-dial enabled setting:', clickToDialEnabled);
          }
        } catch (error) {
          console.error('[main.tsx] Failed to parse settings:', error);
        }
      }
      
      if (clickToDialEnabled) {
        // Feature is enabled - store the number for the app to handle
        if (verboseLogging) {
          console.log('[main.tsx] ✅ Click-to-dial enabled, storing number for dial view');
        }
        
        // Use a short-lived sessionStorage flag that the app will pick up
        sessionStorage.setItem('autoDialNumber', telNumber);
        sessionStorage.setItem('autoDialTimestamp', Date.now().toString());
      } else {
        // Feature is disabled - store a flag to show notification
        if (verboseLogging) {
          console.log('[main.tsx] ⚠️ Click-to-dial disabled, will show notification');
        }
        
        sessionStorage.setItem('clickToDialDisabledNotify', 'true');
      }
      
      // Clear the URL parameter to clean up the address bar
      const url = new URL(window.location.href);
      url.searchParams.delete('tel');
      window.history.replaceState({}, '', url.toString());
    }
  } catch (error) {
    console.error('[main.tsx] Error handling tel: URL:', error);
  }
}

// Handle tel: URL before app initialization
handleTelUrl();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <App />
);
