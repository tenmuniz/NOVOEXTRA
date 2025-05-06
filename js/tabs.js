/**
 * Tabs.js - Modern tab system implementation
 * 
 * This script provides functionality for a responsive and interactive tab system.
 * Features include:
 * - Animated transitions between tabs
 * - Mobile-friendly design
 * - Keyboard accessibility
 */

class TabSystem {
    constructor(container) {
        this.container = container;
        this.tabsElement = container.querySelector('.tabs');
        this.tabs = Array.from(container.querySelectorAll('.tab'));
        this.contentElements = Array.from(container.querySelectorAll('.tab-content'));
        this.activeIndex = 0;
        
        // Find initial active tab
        const activeTabIndex = this.tabs.findIndex(tab => tab.classList.contains('active'));
        if (activeTabIndex >= 0) {
            this.activeIndex = activeTabIndex;
        }
        
        this.init();
    }
    
    init() {
        // Setup event listeners
        this.tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => this.activateTab(index));
            tab.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.activateTab(index);
                }
            });
            
            // Add accessibility attributes
            tab.setAttribute('role', 'tab');
            tab.setAttribute('tabindex', index === this.activeIndex ? '0' : '-1');
            tab.setAttribute('aria-selected', index === this.activeIndex ? 'true' : 'false');
            
            // Add id for content if not present
            const tabId = tab.getAttribute('data-tab') || `tab-${index}`;
            if (!tab.id) {
                tab.id = `tab-${tabId}`;
            }
            
            // Link tab to content
            const contentElement = this.contentElements[index];
            if (contentElement) {
                contentElement.setAttribute('role', 'tabpanel');
                contentElement.setAttribute('aria-labelledby', tab.id);
                contentElement.id = contentElement.id || `content-${tabId}`;
            }
        });
        
        // Set tablist attributes on container
        if (this.tabsElement) {
            this.tabsElement.setAttribute('role', 'tablist');
        }
        
        // Initialize active state
        this.activateTab(this.activeIndex, false);
        
        // Add keyboard navigation
        this.tabsElement.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                
                const direction = e.key === 'ArrowRight' ? 1 : -1;
                let newIndex = this.activeIndex + direction;
                
                // Wrap around
                if (newIndex < 0) newIndex = this.tabs.length - 1;
                if (newIndex >= this.tabs.length) newIndex = 0;
                
                this.activateTab(newIndex);
                this.tabs[newIndex].focus();
            }
        });
    }
    
    activateTab(index, animate = true) {
        if (index < 0 || index >= this.tabs.length) return;
        
        // Update active tab
        this.tabs.forEach((tab, i) => {
            const isActive = i === index;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        
        // Update content visibility
        this.contentElements.forEach((content, i) => {
            if (animate) {
                if (i === index) {
                    // Fade in new content
                    content.style.display = 'block';
                    content.classList.add('active');
                    
                    // Add animation class
                    content.classList.add('animate-in');
                    setTimeout(() => {
                        content.classList.remove('animate-in');
                    }, 400);
                } else {
                    // Only hide after animation completes if it was active
                    if (content.classList.contains('active')) {
                        content.classList.add('animate-out');
                        content.classList.remove('active');
                        
                        setTimeout(() => {
                            content.style.display = 'none';
                            content.classList.remove('animate-out'); 
                        }, 300);
                    } else {
                        content.classList.remove('active');
                        content.style.display = 'none';
                    }
                }
            } else {
                // No animation for initial setup
                content.classList.toggle('active', i === index);
                content.style.display = i === index ? 'block' : 'none';
            }
        });
        
        // Update current index
        this.activeIndex = index;
        
        // Dispatch event
        const event = new CustomEvent('tab-changed', { 
            detail: { 
                index: index,
                tabElement: this.tabs[index],
                contentElement: this.contentElements[index]
            }
        });
        this.container.dispatchEvent(event);
    }
}

// Initialize all tab systems when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const tabContainers = document.querySelectorAll('.tab-system, .tabs-container');
    const tabSystems = [];
    
    tabContainers.forEach(container => {
        try {
            // Make sure container has tabs
            if (container.querySelector('.tabs') && container.querySelectorAll('.tab').length > 0) {
                const system = new TabSystem(container);
                tabSystems.push(system);
                
                // Log successful initialization for debugging
                console.log('Tab system initialized:', container);
            } else {
                console.warn('Tab container missing tabs:', container);
            }
        } catch (error) {
            console.error('Failed to initialize tab system:', error);
        }
    });
    
    // Make accessible globally if needed
    window.tabSystems = tabSystems;
    
    // Also initialize any existing calendar tabs for backward compatibility
    document.querySelectorAll('.calendar-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.id;
            const tabs = this.parentElement.querySelectorAll('.calendar-tab');
            
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
        });
    });
});