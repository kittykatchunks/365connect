/* ====================================================================================== */
/* TAB ALERT MANAGER */
/* Handles tab flashing and alerts when calls come in while user is on another tab */
/* ====================================================================================== */

(function() {
    'use strict';

    class TabAlertManager {
        constructor() {
            this.originalTitle = document.title;
            this.isFlashing = false;
            this.flashInterval = null;
            this.flashState = false;
            this.isPageVisible = !document.hidden;
            
            // Initialize Page Visibility API
            this.initializePageVisibility();
            
            console.log('✅ TabAlertManager initialized');
        }

        /**
         * Initialize Page Visibility API to track when tab is visible/hidden
         */
        initializePageVisibility() {
            // Handle visibility change events
            document.addEventListener('visibilitychange', () => {
                this.isPageVisible = !document.hidden;
                
                if (this.isPageVisible) {
                    console.log('👁️ Page is now visible');
                    // Stop flashing when page becomes visible
                    this.stopFlashing();
                } else {
                    console.log('👁️ Page is now hidden');
                }
            });

            // Handle window focus/blur as backup
            window.addEventListener('focus', () => {
                this.isPageVisible = true;
                this.stopFlashing();
            });

            window.addEventListener('blur', () => {
                this.isPageVisible = false;
            });
        }

        /**
         * Start flashing the tab title and favicon
         * @param {string} alertMessage - Message to flash in title
         */
        startFlashing(alertMessage = '📞 INCOMING CALL') {
            if (this.isFlashing) {
                console.log('⚠️ Already flashing, skipping');
                return;
            }

            console.log('🔔 Starting tab flash alert');
            console.log('📊 Page hidden status:', document.hidden);
            console.log('📊 isPageVisible:', this.isPageVisible);
            
            this.isFlashing = true;
            this.originalTitle = document.title;

            // Flash title every 1 second
            this.flashInterval = setInterval(() => {
                this.flashState = !this.flashState;
                
                if (this.flashState) {
                    document.title = alertMessage;
                } else {
                    document.title = this.originalTitle;
                }
            }, 1000);

            // Also try to change favicon if possible
            this.flashFavicon();
        }

        /**
         * Stop flashing the tab
         */
        stopFlashing() {
            if (!this.isFlashing) {
                return;
            }

            console.log('🔕 Stopping tab flash alert');
            this.isFlashing = false;

            if (this.flashInterval) {
                clearInterval(this.flashInterval);
                this.flashInterval = null;
            }

            // Restore original title
            document.title = this.originalTitle;
            
            // Restore original favicon
            this.restoreFavicon();
        }

        /**
         * Flash favicon by temporarily changing it
         */
        flashFavicon() {
            try {
                // Store original favicon
                let link = document.querySelector("link[rel*='icon']");
                if (!link) {
                    return; // No favicon to change
                }
                
                if (!this.originalFavicon) {
                    this.originalFavicon = link.href;
                }
                
                // Try to use the incoming call icon
                // User can add 'icons/alert-favicon.ico' or 'icons/alert-favicon.png' for custom alert icon
                const alertIcons = [
                    'icons/alert-favicon.ico',
                    'icons/alert-favicon.png', 
                    'icons/IncomingCallIcon.png'
                ];
                
                // Try each alert icon
                for (const iconPath of alertIcons) {
                    const img = new Image();
                    img.onload = () => {
                        link.href = iconPath;
                        console.log('✅ Favicon changed to:', iconPath);
                    };
                    img.onerror = () => {
                        // Silently continue to next option
                    };
                    img.src = iconPath;
                    
                    // Only try first one that might work
                    break;
                }
            } catch (error) {
                console.warn('⚠️ Could not change favicon:', error);
            }
        }

        /**
         * Restore original favicon
         */
        restoreFavicon() {
            try {
                const link = document.querySelector("link[rel*='icon']");
                if (link && this.originalFavicon) {
                    link.href = this.originalFavicon;
                    console.log('✅ Favicon restored');
                }
            } catch (error) {
                console.warn('⚠️ Could not restore favicon:', error);
            }
        }

        /**
         * Check if page is currently visible
         * @returns {boolean}
         */
        isTabVisible() {
            return this.isPageVisible;
        }

        /**
         * Flash tab for a specific duration
         * @param {number} duration - Duration in milliseconds (default: 30 seconds)
         * @param {string} message - Message to display
         */
        flashForDuration(duration = 30000, message = '📞 INCOMING CALL') {
            this.startFlashing(message);
            
            // Auto-stop after duration
            setTimeout(() => {
                this.stopFlashing();
            }, duration);
        }
    }

    // Create singleton instance
    window.TabAlertManager = new TabAlertManager();
    
    console.log('📋 TabAlertManager module loaded');

})();
