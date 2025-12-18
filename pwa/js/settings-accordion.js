/* ====================================================================================== */
/* SETTINGS ACCORDION AND TAB VISIBILITY MANAGER */
/* ====================================================================================== */

(function() {
    'use strict';

    // ===== ACCORDION FUNCTIONALITY =====
    
    // Initialize accordion functionality
    function initializeAccordion() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        
        accordionHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const target = this.getAttribute('data-target');
                const content = document.getElementById(target);
                const isActive = this.classList.contains('active');
                
                // Close all accordion items
                accordionHeaders.forEach(h => {
                    h.classList.remove('active');
                    const c = document.getElementById(h.getAttribute('data-target'));
                    if (c) {
                        c.classList.remove('active');
                    }
                });
                
                // If clicked item wasn't active, open it
                if (!isActive) {
                    this.classList.add('active');
                    if (content) {
                        content.classList.add('active');
                    }
                }
                
                // Save accordion state to localStorage
                if (!isActive) {
                    localStorage.setItem('activeAccordionPanel', target);
                } else {
                    localStorage.removeItem('activeAccordionPanel');
                }
            });
        });
        
        // Restore accordion state from localStorage (only if specified)
        const activePanel = localStorage.getItem('activeAccordionPanel');
        if (activePanel) {
            const header = document.querySelector(`[data-target="${activePanel}"]`);
            const content = document.getElementById(activePanel);
            if (header && content) {
                header.classList.add('active');
                content.classList.add('active');
            }
        }
    }
    
    // Function to close all accordion panels
    function closeAllAccordionPanels() {
        const accordionHeaders = document.querySelectorAll('.accordion-header');
        accordionHeaders.forEach(h => {
            h.classList.remove('active');
            const c = document.getElementById(h.getAttribute('data-target'));
            if (c) {
                c.classList.remove('active');
            }
        });
        localStorage.removeItem('activeAccordionPanel');
    }
    
    // Function to open connection settings accordion
    function openConnectionSettings() {
        const header = document.querySelector('[data-target="connectionSettings"]');
        const content = document.getElementById('connectionSettings');
        if (header && content) {
            header.classList.add('active');
            content.classList.add('active');
            localStorage.setItem('activeAccordionPanel', 'connectionSettings');
        }
    }
    
    // Check if this is first time setup (no connection settings)
    function isFirstTimeSetup() {
        if (window.localDB) {
            const phantomID = window.localDB.getItem('PhantomID', null);
            const username = window.localDB.getItem('SipUsername', null);
            const password = window.localDB.getItem('SipPassword', null);
            
            // If any required setting is missing, it's first time
            return !phantomID || !username || !password;
        }
        return true; // Default to first time if localDB not available
    }
    
    // Show welcome overlay for first-time setup
    function showWelcomeOverlay() {
        const overlay = document.getElementById('welcomeOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            
            // Set up the okay button
            const okayBtn = document.getElementById('welcomeOkayBtn');
            if (okayBtn) {
                okayBtn.onclick = function() {
                    overlay.classList.add('hidden');
                };
            }
        }
    }

    // ===== TAB VISIBILITY FUNCTIONALITY =====
    
    // Tab visibility settings mapping
    const tabVisibilitySettings = {
        'ShowContactsTab': 'navContacts',
        'ShowActivityTab': 'navActivity', 
        'ShowBlank1Tab': 'navBlank1',
        'ShowBlank2Tab': 'navBlank2'
    };
    
    // Initialize tab visibility functionality
    function initializeTabVisibility() {
        // Add event listeners to tab visibility checkboxes
        Object.keys(tabVisibilitySettings).forEach(settingId => {
            const checkbox = document.getElementById(settingId);
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    updateTabVisibility();
                    saveTabVisibilitySettings();
                });
            }
        });
        
        // Load and apply saved tab visibility settings
        loadTabVisibilitySettings();
        updateTabVisibility();
    }
    
    // Update tab visibility based on checkbox states
    function updateTabVisibility() {
        Object.keys(tabVisibilitySettings).forEach(settingId => {
            const checkbox = document.getElementById(settingId);
            const tabId = tabVisibilitySettings[settingId];
            const tab = document.getElementById(tabId);
            
            if (checkbox && tab) {
                if (checkbox.checked) {
                    tab.classList.remove('tab-hidden');
                    tab.classList.remove('disabled');
                    
                    // Special handling for Company Numbers tab (ShowBlank1Tab)
                    if (settingId === 'ShowBlank1Tab') {
                        // Show CLI selector in dial tab
                        const cliSelector = document.getElementById('cliSelectorContainer');
                        if (cliSelector) {
                            cliSelector.classList.remove('hidden');
                        }
                        // Initialize company numbers manager if available
                        if (App && App.managers && App.managers.companyNumbers) {
                            App.managers.companyNumbers.renderCompanyNumbers();
                            App.managers.companyNumbers.updateCliSelector();
                        }
                    }
                } else {
                    tab.classList.add('tab-hidden');
                    
                    // Special handling for Company Numbers tab (ShowBlank1Tab)
                    if (settingId === 'ShowBlank1Tab') {
                        // Hide CLI selector in dial tab
                        const cliSelector = document.getElementById('cliSelectorContainer');
                        if (cliSelector) {
                            cliSelector.classList.add('hidden');
                        }
                    }
                    
                    // If this tab is currently active, switch to dial tab
                    if (tab.classList.contains('active')) {
                        // Switch to dial tab using UI State Manager if available
                        if (App && App.managers && App.managers.ui && typeof App.managers.ui.switchView === 'function') {
                            App.managers.ui.switchView('dial');
                        } else {
                            // Fallback: manually switch to dial tab
                            tab.classList.remove('active');
                            const dialTab = document.getElementById('navDial');
                            if (dialTab) {
                                dialTab.classList.add('active');
                                // Hide all content areas and show dial area
                                document.querySelectorAll('.content-area').forEach(area => {
                                    area.classList.remove('active');
                                    area.classList.add('hidden');
                                });
                                const dialArea = document.getElementById('dialArea');
                                if (dialArea) {
                                    dialArea.classList.add('active');
                                    dialArea.classList.remove('hidden');
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Save tab visibility settings to localStorage
    function saveTabVisibilitySettings() {
        const settings = {};
        Object.keys(tabVisibilitySettings).forEach(settingId => {
            const checkbox = document.getElementById(settingId);
            if (checkbox) {
                settings[settingId] = checkbox.checked;
            }
        });
        localStorage.setItem('tabVisibilitySettings', JSON.stringify(settings));
    }
    
    // Load tab visibility settings from localStorage
    function loadTabVisibilitySettings() {
        const savedSettings = localStorage.getItem('tabVisibilitySettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                Object.keys(settings).forEach(settingId => {
                    const checkbox = document.getElementById(settingId);
                    if (checkbox) {
                        checkbox.checked = settings[settingId];
                    }
                });
            } catch (e) {
                console.log('Error loading tab visibility settings:', e);
            }
        }
    }
    
    // Make tab visibility functions globally available for settings save/load
    window.updateTabVisibility = updateTabVisibility;
    window.saveTabVisibilitySettings = saveTabVisibilitySettings;
    window.loadTabVisibilitySettings = loadTabVisibilitySettings;
    
    // ===== INITIALIZATION =====
    
    document.addEventListener('DOMContentLoaded', function() {
        console.log('⚙️ Initializing settings accordion and tab visibility...');
        
        // Listen for settings tab navigation to close all accordions
        const navSettings = document.getElementById('navSettings');
        if (navSettings) {
            navSettings.addEventListener('click', function() {
                // Close all accordion panels when opening settings (unless first time)
                if (!isFirstTimeSetup()) {
                    setTimeout(() => {
                        closeAllAccordionPanels();
                    }, 100);
                }
            });
        }
        
        // Initialize accordion and tab visibility when DOM is ready
        initializeAccordion();
        initializeTabVisibility();
        
        // Check if first time setup is needed
        setTimeout(() => {
            if (isFirstTimeSetup()) {
                console.log('🆕 First time setup detected');
                // Switch to settings tab
                if (App && App.managers && App.managers.ui && typeof App.managers.ui.switchView === 'function') {
                    App.managers.ui.switchView('settings');
                }
                // Open connection settings accordion
                openConnectionSettings();
                // Show welcome overlay
                showWelcomeOverlay();
            } else {
                console.log('✅ Existing configuration found');
            }
        }, 500);
        
        // ===== MODAL HANDLERS =====
        
        // BLF Configuration modal close handlers
        const blfModalClose = document.getElementById('blfModalClose');
        if (blfModalClose) {
            blfModalClose.addEventListener('click', () => {
                if (window.BLFManager && typeof window.BLFManager.hideBlfModal === 'function') {
                    window.BLFManager.hideBlfModal();
                }
            });
        }

        // Click outside modal to close
        document.addEventListener('click', (e) => {
            const blfModal = document.getElementById('blfModal');
            if (blfModal && e.target === blfModal) {
                if (window.BLFManager && typeof window.BLFManager.hideBlfModal === 'function') {
                    window.BLFManager.hideBlfModal();
                }
            }
        });

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const blfModal = document.getElementById('blfModal');
                if (blfModal && blfModal.classList.contains('show')) {
                    if (window.BLFManager && typeof window.BLFManager.hideBlfModal === 'function') {
                        window.BLFManager.hideBlfModal();
                    }
                }
            }
        });
        
        console.log('✅ Settings accordion and tab visibility initialized');
    });
    
})();
