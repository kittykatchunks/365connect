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
            // Only flash if page is not visible
            if (this.isPageVisible) {
                console.log('👁️ Page is visible, skipping tab flash');
                return;
            }

            if (this.isFlashing) {
                console.log('⚠️ Already flashing, skipping');
                return;
            }

            console.log('🔔 Starting tab flash alert');
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
                const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
                link.type = 'image/x-icon';
                link.rel = 'icon';
                
                // Try to use a red/alert version of favicon if available, otherwise keep original
                // This could be enhanced with an actual alert icon
                const alertIcon = 'icons/IncomingCallIcon.png'; // Use incoming call icon
                
                // Check if we can access the icon
                fetch(alertIcon, { method: 'HEAD' })
                    .then(response => {
                        if (response.ok) {
                            link.href = alertIcon;
                            if (!link.parentNode) {
                                document.head.appendChild(link);
                            }
                        }
                    })
                    .catch(() => {
                        // Silently fail if icon not available
                        console.log('⚠️ Alert icon not available, keeping original favicon');
                    });
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
                if (link) {
                    link.href = 'favicon.ico';
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
