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
    let telNumber = urlParams.get('tel');
    
    if (telNumber) {
      const verboseLogging = localStorage.getItem('VerboseLogging') === 'true';
      
      if (verboseLogging) {
        console.log('[main.tsx] 📞 Detected tel: URL parameter:', telNumber);
      }
      
      // Strip "tel:" prefix if present (can happen with some browsers)
      if (telNumber.toLowerCase().startsWith('tel:')) {
        telNumber = telNumber.substring(4);
        if (verboseLogging) {
          console.log('[main.tsx] 🔧 Stripped tel: prefix, cleaned number:', telNumber);
        }
      }
      
      // URL decode the number (handles + and other special characters)
      telNumber = decodeURIComponent(telNumber);
      
      if (verboseLogging) {
        console.log('[main.tsx] 📞 Final cleaned number:', telNumber);
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
        
        // Set flag to auto-reconnect SIP after reload (minimize disconnection time)
        sessionStorage.setItem('autoReconnectSIP', 'true');
        
        if (verboseLogging) {
          console.log('[main.tsx] 🔄 Auto-reconnect flag set for seamless SIP recovery');
        }
      } else {
        // Feature is disabled - store a flag to show notification
        if (verboseLogging) {
          console.log('[main.tsx] ⚠️ Click-to-dial disabled, will show notification');
        }
        
        sessionStorage.setItem('clickToDialDisabledNotify', 'true');
      }
      
      // Clear the URL parameter to clean up the address bar without reload
      // Use replaceState with current URL to avoid navigation/reload
      if (window.history.replaceState) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState(null, '', cleanUrl);
        
        if (verboseLogging) {
          console.log('[main.tsx] 🧹 Cleaned URL parameter without reload');
        }
      }
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
