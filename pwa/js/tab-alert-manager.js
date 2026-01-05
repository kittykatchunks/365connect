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
            this.dialTab = null;
            
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
         * Start flashing the Dial navigation tab
         * @param {string} alertMessage - Message to flash in title (optional)
         */
        startFlashing(alertMessage = '📞 INCOMING CALL') {
            if (this.isFlashing) {
                console.log('⚠️ Already flashing, skipping');
                return;
            }

            console.log('🔔 Starting Dial tab flash alert');
            this.isFlashing = true;
            
            // Get the Dial navigation tab
            this.dialTab = document.getElementById('navDial');
            
            if (!this.dialTab) {
                console.error('❌ Dial tab not found');
                return;
            }
            
            // Add flashing class to Dial tab
            this.dialTab.classList.add('tab-flashing');
            console.log('✅ Dial tab flashing started');
        }

        /**
         * Stop flashing the Dial tab
         */
        stopFlashing() {
            if (!this.isFlashing) {
                return;
            }

            console.log('🔕 Stopping Dial tab flash alert');
            this.isFlashing = false;

            // Remove flashing class from Dial tab
            if (this.dialTab) {
                this.dialTab.classList.remove('tab-flashing');
                console.log('✅ Dial tab flashing stopped');
            }
        }

        /**
         * Check if page is currently visible
         * @returns {boolean}
         */
        isTabVisible() {
            return this.isPageVisible;
        }
    }

    // Create singleton instance
    console.log('📋 Creating TabAlertManager instance...');
    window.TabAlertManager = new TabAlertManager();
    console.log('✅ TabAlertManager module loaded and attached to window');
    console.log('🔍 window.TabAlertManager:', window.TabAlertManager);

})();
