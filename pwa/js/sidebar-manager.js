/**
 * AUTOCAB365CONNECT PWA - SIDEBAR MANAGER
 * Handles detection and optimization for sidebar/narrow display modes
 * Version: 1.0.0
 */

class SidebarManager {
    constructor() {
        this.isSidebarMode = false;
        this.displayMode = 'unknown';
        this.viewportWidth = window.innerWidth;
        this.observers = [];
        
        this.init();
    }
    
    /**
     * Initialize sidebar detection and responsive handlers
     */
    init() {
        console.log('[SidebarManager] Initializing...');
        
        // Detect initial display mode
        this.detectDisplayMode();
        
        // Set up responsive listeners
        this.setupResizeObserver();
        this.setupMediaQueryListeners();
        
        // Apply initial optimizations
        this.applyOptimizations();
        
        console.log(`[SidebarManager] Initialized - Display Mode: ${this.displayMode}, Sidebar: ${this.isSidebarMode}`);
    }
    
    /**
     * Detect the current PWA display mode
     */
    detectDisplayMode() {
        // Check for window-controls-overlay
        if (window.matchMedia('(display-mode: window-controls-overlay)').matches) {
            this.displayMode = 'window-controls-overlay';
        }
        // Check for standalone (installed PWA)
        else if (window.matchMedia('(display-mode: standalone)').matches) {
            this.displayMode = 'standalone';
        }
        // Check for minimal-ui
        else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
            this.displayMode = 'minimal-ui';
        }
        // Check for fullscreen
        else if (window.matchMedia('(display-mode: fullscreen)').matches) {
            this.displayMode = 'fullscreen';
        }
        // Default to browser
        else {
            this.displayMode = 'browser';
        }
        
        // Detect sidebar mode based on narrow width + standalone
        this.updateSidebarMode();
        
        // Add attribute to body for CSS targeting
        document.body.setAttribute('data-display-mode', this.displayMode);
        document.body.setAttribute('data-sidebar-mode', this.isSidebarMode);
    }
    
    /**
     * Update sidebar mode detection
     */
    updateSidebarMode() {
        this.viewportWidth = window.innerWidth;
        
        // Sidebar mode criteria: 
        // - Narrow width (< 450px typical for sidebars)
        // - Running as standalone PWA
        const isNarrow = this.viewportWidth <= 450;
        const isStandalone = this.displayMode === 'standalone' || 
                            this.displayMode === 'window-controls-overlay' ||
                            this.displayMode === 'minimal-ui';
        
        const wasSidebarMode = this.isSidebarMode;
        this.isSidebarMode = isNarrow && isStandalone;
        
        // Update body attribute
        document.body.setAttribute('data-sidebar-mode', this.isSidebarMode);
        
        // Trigger mode change event if changed
        if (wasSidebarMode !== this.isSidebarMode) {
            this.onSidebarModeChange();
        }
        
        return this.isSidebarMode;
    }
    
    /**
     * Set up resize observer for responsive behavior
     */
    setupResizeObserver() {
        let resizeTimer;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.updateSidebarMode();
                this.applyOptimizations();
            }, 150);
        });
    }
    
    /**
     * Set up media query listeners for display mode changes
     */
    setupMediaQueryListeners() {
        const displayModes = [
            'window-controls-overlay',
            'standalone',
            'minimal-ui',
            'fullscreen',
            'browser'
        ];
        
        displayModes.forEach(mode => {
            const mq = window.matchMedia(`(display-mode: ${mode})`);
            mq.addEventListener('change', (e) => {
                if (e.matches) {
                    this.displayMode = mode;
                    this.detectDisplayMode();
                    this.applyOptimizations();
                }
            });
        });
    }
    
    /**
     * Apply optimizations based on sidebar mode
     */
    applyOptimizations() {
        if (this.isSidebarMode) {
            console.log('[SidebarManager] Applying sidebar optimizations...');
            
            // Add sidebar-specific class
            document.body.classList.add('sidebar-view');
            
            // Optimize for narrow layout
            this.optimizeForNarrow();
            
            // Adjust UI elements
            this.adjustUIForSidebar();
            
        } else {
            document.body.classList.remove('sidebar-view');
        }
    }
    
    /**
     * Optimize layout for narrow sidebar view
     */
    optimizeForNarrow() {
        // Compact header if exists
        const header = document.querySelector('.headerBar');
        if (header) {
            header.classList.add('header-compact');
        }
        
        // Optimize tabs for horizontal scrolling
        const tabsContainer = document.querySelector('.tabs-container');
        if (tabsContainer) {
            tabsContainer.style.overflowX = 'auto';
            tabsContainer.style.whiteSpace = 'nowrap';
        }
        
        // Hide non-essential elements in extreme narrow views
        if (this.viewportWidth < 350) {
            this.hideNonEssentialElements();
        }
    }
    
    /**
     * Adjust UI elements for sidebar display
     */
    adjustUIForSidebar() {
        // Adjust dialpad if visible
        const dialpad = document.querySelector('.dialpadKey');
        if (dialpad) {
            const keys = document.querySelectorAll('.dialpadKey');
            keys.forEach(key => {
                key.style.width = this.viewportWidth < 350 ? '50px' : '60px';
                key.style.height = this.viewportWidth < 350 ? '50px' : '60px';
            });
        }
        
        // Adjust modal widths
        const modals = document.querySelectorAll('.modal-content');
        modals.forEach(modal => {
            if (this.isSidebarMode) {
                modal.style.width = '100%';
                modal.style.maxWidth = '100%';
            }
        });
    }
    
    /**
     * Hide non-essential elements in ultra-narrow view
     */
    hideNonEssentialElements() {
        const selectorsToHide = [
            '.sidebar-hidden',
            '.desktop-only',
            '.wide-screen-only'
        ];
        
        selectorsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el.style.display = 'none');
        });
    }
    
    /**
     * Handle sidebar mode changes
     */
    onSidebarModeChange() {
        console.log(`[SidebarManager] Mode changed - Sidebar: ${this.isSidebarMode}`);
        
        // Dispatch custom event for other components
        const event = new CustomEvent('sidebarmodechange', {
            detail: {
                isSidebarMode: this.isSidebarMode,
                displayMode: this.displayMode,
                viewportWidth: this.viewportWidth
            }
        });
        window.dispatchEvent(event);
        
        // Notify App.managers if available
        if (window.App && window.App.managers && window.App.managers.ui) {
            window.App.managers.ui.onSidebarModeChange(this.isSidebarMode);
        }
    }
    
    /**
     * Get current sidebar status
     */
    getSidebarStatus() {
        return {
            isSidebarMode: this.isSidebarMode,
            displayMode: this.displayMode,
            viewportWidth: this.viewportWidth,
            viewportHeight: window.innerHeight
        };
    }
    
    /**
     * Check if running in sidebar mode
     */
    isSidebar() {
        return this.isSidebarMode;
    }
    
    /**
     * Get optimal layout configuration for current view
     */
    getLayoutConfig() {
        if (this.isSidebarMode) {
            return {
                layout: 'sidebar',
                dialpadSize: this.viewportWidth < 350 ? 'small' : 'medium',
                showExtendedInfo: false,
                compactMode: true,
                maxVisibleSessions: 3,
                hideNonEssential: this.viewportWidth < 350
            };
        } else if (this.viewportWidth < 768) {
            return {
                layout: 'mobile',
                dialpadSize: 'large',
                showExtendedInfo: false,
                compactMode: false,
                maxVisibleSessions: 5,
                hideNonEssential: false
            };
        } else {
            return {
                layout: 'desktop',
                dialpadSize: 'large',
                showExtendedInfo: true,
                compactMode: false,
                maxVisibleSessions: 10,
                hideNonEssential: false
            };
        }
    }
    
    /**
     * Register for sidebar mode change notifications
     */
    on(event, callback) {
        if (event === 'modechange') {
            window.addEventListener('sidebarmodechange', callback);
            this.observers.push({ event, callback });
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.observers.forEach(observer => {
            window.removeEventListener('sidebarmodechange', observer.callback);
        });
        this.observers = [];
    }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SidebarManager;
}

// Auto-initialize if App is available
if (typeof window !== 'undefined') {
    window.SidebarManager = SidebarManager;
}
