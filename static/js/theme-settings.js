// Theme Settings Management
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const themeSettingsPanel = document.getElementById('theme-settings-panel');
    const openButton = document.getElementById('theme-settings-button');
    const closeButton = document.getElementById('close-theme-settings');
    const resetButton = document.getElementById('reset-settings');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const themeOptions = document.querySelectorAll('.theme-option');
    const fontSizeButtons = document.querySelectorAll('.font-size-buttons button');
    const fontSizeValue = document.getElementById('font-size-value');
    const fontSizeDecrease = document.getElementById('decrease-font');
    const fontSizeIncrease = document.getElementById('increase-font');
    const contrastButtons = document.querySelectorAll('.contrast-option');
    const animationsToggle = document.getElementById('animations-toggle');

    // Default settings
    const defaultSettings = {
        theme: 'blue',
        darkMode: false,
        fontSize: 100,
        contrast: 'normal',
        animations: true
    };

    // Initialize settings
    let currentSettings = loadSettings() || { ...defaultSettings };
    applySettings(currentSettings);
    updateUI(currentSettings);

    // Event Listeners
    if (openButton) {
        openButton.addEventListener('click', togglePanel);
    }

    if (closeButton) {
        closeButton.addEventListener('click', togglePanel);
    }

    if (resetButton) {
        resetButton.addEventListener('click', resetSettings);
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', function() {
            currentSettings.darkMode = this.checked;
            saveSettings(currentSettings);
            applySettings(currentSettings);
        });
    }

    // Theme color options
    themeOptions.forEach(option => {
        option.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');
            currentSettings.theme = theme;
            saveSettings(currentSettings);
            applySettings(currentSettings);
            updateUI(currentSettings);
        });
    });

    // Font size controls
    if (fontSizeDecrease) {
        fontSizeDecrease.addEventListener('click', function() {
            if (currentSettings.fontSize > 70) {
                currentSettings.fontSize -= 10;
                saveSettings(currentSettings);
                applySettings(currentSettings);
                updateUI(currentSettings);
            }
        });
    }

    if (fontSizeIncrease) {
        fontSizeIncrease.addEventListener('click', function() {
            if (currentSettings.fontSize < 150) {
                currentSettings.fontSize += 10;
                saveSettings(currentSettings);
                applySettings(currentSettings);
                updateUI(currentSettings);
            }
        });
    }

    // Contrast options
    contrastButtons.forEach(button => {
        button.addEventListener('click', function() {
            const contrast = this.getAttribute('data-contrast');
            currentSettings.contrast = contrast;
            saveSettings(currentSettings);
            applySettings(currentSettings);
            updateUI(currentSettings);
        });
    });

    // Animations toggle
    if (animationsToggle) {
        animationsToggle.addEventListener('change', function() {
            currentSettings.animations = this.checked;
            saveSettings(currentSettings);
            applySettings(currentSettings);
        });
    }

    // Function to toggle the settings panel
    function togglePanel() {
        themeSettingsPanel.classList.toggle('active');
    }

    // Function to reset settings
    function resetSettings() {
        currentSettings = { ...defaultSettings };
        saveSettings(currentSettings);
        applySettings(currentSettings);
        updateUI(currentSettings);
    }

    // Function to load settings from localStorage
    function loadSettings() {
        const settings = localStorage.getItem('themeSettings');
        return settings ? JSON.parse(settings) : null;
    }

    // Function to save settings to localStorage
    function saveSettings(settings) {
        localStorage.setItem('themeSettings', JSON.stringify(settings));
    }

    // Function to update the UI based on current settings
    function updateUI(settings) {
        // Update dark mode toggle
        if (darkModeToggle) {
            darkModeToggle.checked = settings.darkMode;
        }

        // Update active theme
        themeOptions.forEach(option => {
            const theme = option.getAttribute('data-theme');
            if (theme === settings.theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });

        // Update font size display
        if (fontSizeValue) {
            fontSizeValue.textContent = settings.fontSize + '%';
        }

        // Update contrast buttons
        contrastButtons.forEach(button => {
            const contrast = button.getAttribute('data-contrast');
            if (contrast === settings.contrast) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });

        // Update animations toggle
        if (animationsToggle) {
            animationsToggle.checked = settings.animations;
        }
    }

    // Function to apply settings to the document
    function applySettings(settings) {
        // Apply dark mode
        if (settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        // Apply theme color
        document.documentElement.setAttribute('data-color-theme', settings.theme);
        
        // Apply font size
        document.documentElement.style.fontSize = settings.fontSize + '%';
        
        // Apply contrast
        document.documentElement.setAttribute('data-contrast', settings.contrast);
        
        // Apply animations setting
        if (settings.animations) {
            document.documentElement.removeAttribute('data-animations');
        } else {
            document.documentElement.setAttribute('data-animations', 'disabled');
        }
    }

    // Close panel when clicking outside
    document.addEventListener('click', function(event) {
        if (themeSettingsPanel.classList.contains('active') && 
            !themeSettingsPanel.contains(event.target) && 
            event.target !== openButton) {
            themeSettingsPanel.classList.remove('active');
        }
    });

    // Close panel on escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && themeSettingsPanel.classList.contains('active')) {
            themeSettingsPanel.classList.remove('active');
        }
    });
}); 