/**
 * Theme Manager
 * 
 * Handles theme switching, saving preferences to local storage,
 * and respecting system preferences.
 */

class ThemeManager {
    constructor() {
        // Available themes
        this.themes = [
            'blue',      // Default
            'dark',
            'green',
            'purple',
            'red',
            'orange',
            'high-contrast',
            'low-contrast'
        ];
        
        // UI elements references (to be set later)
        this.themeToggle = null;
        this.fontSizeControls = {
            decrease: null,
            increase: null,
            value: null,
            currentSize: 100 // default 100%
        };
        this.animationsToggle = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        // Apply saved theme or detect system preference
        this.applySavedTheme();
        
        // Monitor for system preference changes
        this.setupSystemPreferenceListener();
        
        // Setup event handlers once DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            this.setupUIElements();
            this.setupEventListeners();
        });
    }
    
    setupUIElements() {
        // Theme toggle switch
        this.themeToggle = document.getElementById('theme-toggle');
        
        // Font size controls
        this.fontSizeControls.decrease = document.getElementById('decrease-font');
        this.fontSizeControls.increase = document.getElementById('increase-font');
        this.fontSizeControls.value = document.getElementById('font-size-value');
        
        // Animations toggle
        this.animationsToggle = document.getElementById('animations-toggle');
        
        // Theme selector
        this.themeSelector = document.querySelector('.theme-selector');
        
        // Update UI to match current settings
        this.updateUIState();
    }
    
    updateUIState() {
        // Update theme toggle for dark/light mode
        if (this.themeToggle) {
            this.themeToggle.checked = this.getCurrentTheme() === 'dark';
        }
        
        // Update font size display
        if (this.fontSizeControls.value) {
            const savedFontSize = localStorage.getItem('font-size') || '100';
            this.fontSizeControls.currentSize = parseInt(savedFontSize);
            this.fontSizeControls.value.textContent = `${savedFontSize}%`;
            this.applyFontSize(this.fontSizeControls.currentSize);
        }
        
        // Update animations toggle
        if (this.animationsToggle) {
            const reduceMotion = localStorage.getItem('reduce-motion') === 'true';
            this.animationsToggle.checked = !reduceMotion;
            document.documentElement.setAttribute('data-reduce-motion', reduceMotion);
        }
        
        // Highlight active theme in theme selector
        if (this.themeSelector) {
            const currentTheme = this.getCurrentTheme();
            const themeOptions = this.themeSelector.querySelectorAll('.theme-option');
            
            themeOptions.forEach(option => {
                const themeValue = option.getAttribute('data-theme');
                if (themeValue === currentTheme) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        }
    }
    
    setupEventListeners() {
        // Theme toggle switch event
        if (this.themeToggle) {
            this.themeToggle.addEventListener('change', () => {
                if (this.themeToggle.checked) {
                    this.setTheme('dark');
                } else {
                    this.setTheme('blue'); // Default light theme
                }
            });
        }
        
        // Font size controls events
        if (this.fontSizeControls.decrease) {
            this.fontSizeControls.decrease.addEventListener('click', () => {
                if (this.fontSizeControls.currentSize > 70) {
                    this.fontSizeControls.currentSize -= 10;
                    this.updateFontSize();
                }
            });
        }
        
        if (this.fontSizeControls.increase) {
            this.fontSizeControls.increase.addEventListener('click', () => {
                if (this.fontSizeControls.currentSize < 150) {
                    this.fontSizeControls.currentSize += 10;
                    this.updateFontSize();
                }
            });
        }
        
        // Animations toggle event
        if (this.animationsToggle) {
            this.animationsToggle.addEventListener('change', () => {
                const reduceMotion = !this.animationsToggle.checked;
                localStorage.setItem('reduce-motion', reduceMotion);
                document.documentElement.setAttribute('data-reduce-motion', reduceMotion);
            });
        }
        
        // Theme options events
        if (this.themeSelector) {
            const themeOptions = this.themeSelector.querySelectorAll('.theme-option');
            
            themeOptions.forEach(option => {
                option.addEventListener('click', () => {
                    const themeValue = option.getAttribute('data-theme');
                    this.setTheme(themeValue);
                    this.updateUIState();
                });
            });
        }
    }
    
    updateFontSize() {
        this.fontSizeControls.value.textContent = `${this.fontSizeControls.currentSize}%`;
        localStorage.setItem('font-size', this.fontSizeControls.currentSize.toString());
        this.applyFontSize(this.fontSizeControls.currentSize);
    }
    
    applyFontSize(size) {
        document.documentElement.style.fontSize = `${size}%`;
    }
    
    setupSystemPreferenceListener() {
        // Listen for system color scheme preference changes
        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleSystemThemeChange = (event) => {
            // Only apply system preference if user hasn't set a preference
            if (!localStorage.getItem('theme')) {
                this.setTheme(event.matches ? 'dark' : 'blue');
                this.updateUIState();
            }
        };
        
        // Listen for changes
        if (darkModeMediaQuery.addEventListener) {
            darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
        } else {
            // Fallback for older browsers
            darkModeMediaQuery.addListener(handleSystemThemeChange);
        }
        
        // Apply system preference on first load if no saved preference
        if (!localStorage.getItem('theme')) {
            handleSystemThemeChange(darkModeMediaQuery);
        }
        
        // Listen for reduced motion preference
        const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        const handleReducedMotionChange = (event) => {
            if (!localStorage.getItem('reduce-motion')) {
                document.documentElement.setAttribute('data-reduce-motion', event.matches);
                if (this.animationsToggle) {
                    this.animationsToggle.checked = !event.matches;
                }
            }
        };
        
        // Listen for changes
        if (reducedMotionMediaQuery.addEventListener) {
            reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);
        } else {
            // Fallback for older browsers
            reducedMotionMediaQuery.addListener(handleReducedMotionChange);
        }
        
        // Apply system preference on first load if no saved preference
        if (!localStorage.getItem('reduce-motion')) {
            handleReducedMotionChange(reducedMotionMediaQuery);
        }
    }
    
    applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // Check system preference
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDarkMode ? 'dark' : 'blue');
        }
        
        // Apply saved font size
        const savedFontSize = localStorage.getItem('font-size');
        if (savedFontSize) {
            this.applyFontSize(parseInt(savedFontSize));
            if (this.fontSizeControls) {
                this.fontSizeControls.currentSize = parseInt(savedFontSize);
            }
        }
    }
    
    setTheme(theme) {
        // Check if theme is valid
        if (!this.themes.includes(theme)) {
            console.error(`Invalid theme: ${theme}`);
            return;
        }
        
        // Save to local storage
        localStorage.setItem('theme', theme);
        
        // Apply theme to html element
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update UI if already initialized
        if (this.themeToggle) {
            this.updateUIState();
        }
    }
    
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'blue';
    }
    
    // Public methods for external use
    getPreferences() {
        return {
            theme: this.getCurrentTheme(),
            fontSize: this.fontSizeControls.currentSize,
            reduceMotion: localStorage.getItem('reduce-motion') === 'true'
        };
    }
    
    resetToDefaults() {
        localStorage.removeItem('theme');
        localStorage.removeItem('font-size');
        localStorage.removeItem('reduce-motion');
        
        // Re-apply system preferences
        this.applySavedTheme();
        this.updateUIState();
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Make the theme manager accessible globally
window.themeManager = themeManager; 