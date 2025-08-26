// Auto Tab Closer - Options Script
// Handles the options page functionality

class OptionsManager {
    constructor() {
        this.settings = {
            enabled: true,
            countdownSeconds: 6,
            checkDelay: 1000,
            logLevel: 'warn',
            maxTabsPerDay: 0,
            showNotifications: false,
            rememberUserChoices: false,
            watchedDomains: {}
        };
        
        this.init();
    }

    async init() {
        // Load current settings
        await this.loadSettings();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Populate domain configurations
        this.populateDomainConfigs();
        
        // Update UI with current settings
        this.updateUI();
    }

    async loadSettings() {
        try {
            const saved = await browser.storage.local.get(null);
            
            // Load basic settings
            if (saved.enabled !== undefined) this.settings.enabled = saved.enabled;
            if (saved.countdownSeconds !== undefined) this.settings.countdownSeconds = saved.countdownSeconds;
            if (saved.checkDelay !== undefined) this.settings.checkDelay = saved.checkDelay;
            if (saved.logLevel !== undefined) this.settings.logLevel = saved.logLevel;
            if (saved.maxTabsPerDay !== undefined) this.settings.maxTabsPerDay = saved.maxTabsPerDay;
            if (saved.showNotifications !== undefined) this.settings.showNotifications = saved.showNotifications;
            if (saved.rememberUserChoices !== undefined) this.settings.rememberUserChoices = saved.rememberUserChoices;
            
            // Load domain configurations
            if (saved.watchedDomains) {
                this.settings.watchedDomains = saved.watchedDomains;
            } else {
                // Set default domain configurations
                this.settings.watchedDomains = {
                    'zoom.us': {
                        enabled: true,
                        patterns: ['*://*.zoom.us/j/*', '*://*.zoom.us/w/*', '*://*.zoom.us/s/*'],
                        titlePatterns: ['^Launching.*Zoom', '^Zoom.*Launching'],
                        domMarkers: ['#zoom-ui-frame', '.zoom-ui-frame'],
                        deepLinkSchemes: ['zoommtg://']
                    },
                    'figma.com': {
                        enabled: true,
                        patterns: ['*://*.figma.com/file/*'],
                        titlePatterns: ['Open in app', 'Launch.*Figma'],
                        domMarkers: ['.figma-deep-link', '[data-deep-link]'],
                        deepLinkSchemes: ['figma://']
                    },
                    'slack.com': {
                        enabled: true,
                        patterns: ['*://*.slack.com/call/*'],
                        titlePatterns: ['Launching.*Slack', 'Slack.*Call'],
                        domMarkers: ['.slack-call-launcher'],
                        deepLinkSchemes: ['slack://']
                    },
                    'teams.microsoft.com': {
                        enabled: true,
                        patterns: ['*://*.teams.microsoft.com/meet/*'],
                        titlePatterns: ['Launching.*Teams', 'Teams.*Meeting'],
                        domMarkers: ['.teams-meeting-launcher'],
                        deepLinkSchemes: ['msteams://']
                    },
                    'discord.com': {
                        enabled: true,
                        patterns: ['*://*.discord.com/invite/*'],
                        titlePatterns: ['Launching.*Discord', 'Discord.*Invite'],
                        domMarkers: ['.discord-invite-launcher'],
                        deepLinkSchemes: ['discord://']
                    }
                };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    setupEventListeners() {
        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetToDefaults();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportSettings();
        });

        // Import button
        document.getElementById('importBtn').addEventListener('click', () => {
            this.importSettings();
        });
    }

    populateDomainConfigs() {
        const container = document.getElementById('domainConfigs');
        container.innerHTML = '';

        Object.entries(this.settings.watchedDomains).forEach(([domain, config]) => {
            const domainConfig = this.createDomainConfigElement(domain, config);
            container.appendChild(domainConfig);
        });
    }

    createDomainConfigElement(domain, config) {
        const div = document.createElement('div');
        div.className = 'domain-config';
        div.innerHTML = `
            <div class="domain-header">
                <span class="domain-name">${domain}</span>
                <div class="domain-toggle">
                    <input type="checkbox" id="domain_${domain}" ${config.enabled ? 'checked' : ''}>
                    <label for="domain_${domain}">Enabled</label>
                </div>
            </div>
            <div class="domain-patterns">
                <label>URL Patterns:</label>
                <div id="patterns_${domain}">
                    ${config.patterns.map(pattern => `
                        <div class="pattern-input">
                            <input type="text" value="${pattern}" placeholder="URL pattern">
                            <button onclick="this.parentElement.remove()">Remove</button>
                        </div>
                    `).join('')}
                </div>
                <div class="add-pattern">
                    <button onclick="addPattern('${domain}')">Add Pattern</button>
                </div>
            </div>
        `;

        // Add event listener for domain toggle
        const toggle = div.querySelector(`#domain_${domain}`);
        toggle.addEventListener('change', (e) => {
            this.settings.watchedDomains[domain].enabled = e.target.checked;
        });

        // Add event listeners for pattern inputs
        const patternInputs = div.querySelectorAll('.pattern-input input');
        patternInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                this.settings.watchedDomains[domain].patterns[index] = e.target.value;
            });
        });

        return div;
    }

    updateUI() {
        // Update form elements with current settings
        document.getElementById('enabled').checked = this.settings.enabled;
        document.getElementById('countdownSeconds').value = this.settings.countdownSeconds;
        document.getElementById('checkDelay').value = this.settings.checkDelay;
        document.getElementById('logLevel').value = this.settings.logLevel;
        document.getElementById('maxTabsPerDay').value = this.settings.maxTabsPerDay;
        document.getElementById('showNotifications').checked = this.settings.showNotifications;
        document.getElementById('rememberUserChoices').checked = this.settings.rememberUserChoices;
    }

    async saveSettings() {
        try {
            // Collect form values
            this.settings.enabled = document.getElementById('enabled').checked;
            this.settings.countdownSeconds = parseInt(document.getElementById('countdownSeconds').value);
            this.settings.checkDelay = parseInt(document.getElementById('checkDelay').value);
            this.settings.logLevel = document.getElementById('logLevel').value;
            this.settings.maxTabsPerDay = parseInt(document.getElementById('maxTabsPerDay').value);
            this.settings.showNotifications = document.getElementById('showNotifications').checked;
            this.settings.rememberUserChoices = document.getElementById('rememberUserChoices').checked;

            // Save to storage
            await browser.storage.local.set(this.settings);

            // Send message to background script
            await browser.runtime.sendMessage({
                action: 'updateSettings',
                settings: this.settings
            });

            this.showStatus('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Error saving settings: ' + error.message, 'error');
        }
    }

    async resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
            try {
                // Clear storage
                await browser.storage.local.clear();
                
                // Reload settings
                await this.loadSettings();
                
                // Update UI
                this.updateUI();
                this.populateDomainConfigs();
                
                this.showStatus('Settings reset to defaults!', 'success');
            } catch (error) {
                console.error('Error resetting settings:', error);
                this.showStatus('Error resetting settings: ' + error.message, 'error');
            }
        }
    }

    exportSettings() {
        try {
            const dataStr = JSON.stringify(this.settings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = 'auto-tab-closer-settings.json';
            link.click();
            
            this.showStatus('Settings exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting settings:', error);
            this.showStatus('Error exporting settings: ' + error.message, 'error');
        }
    }

    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const importedSettings = JSON.parse(text);
                
                // Validate imported settings
                if (this.validateSettings(importedSettings)) {
                    this.settings = { ...this.settings, ...importedSettings };
                    await browser.storage.local.set(this.settings);
                    
                    this.updateUI();
                    this.populateDomainConfigs();
                    
                    this.showStatus('Settings imported successfully!', 'success');
                } else {
                    this.showStatus('Invalid settings file format', 'error');
                }
            } catch (error) {
                console.error('Error importing settings:', error);
                this.showStatus('Error importing settings: ' + error.message, 'error');
            }
        };
        
        input.click();
    }

    validateSettings(settings) {
        // Basic validation
        return settings && 
               typeof settings.enabled === 'boolean' &&
               typeof settings.countdownSeconds === 'number' &&
               settings.countdownSeconds >= 3 &&
               settings.countdownSeconds <= 60;
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        statusElement.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
    }
}

// Global function for adding patterns (called from HTML)
function addPattern(domain) {
    const patternsContainer = document.getElementById(`patterns_${domain}`);
    const patternDiv = document.createElement('div');
    patternDiv.className = 'pattern-input';
    patternDiv.innerHTML = `
        <input type="text" placeholder="URL pattern">
        <button onclick="this.parentElement.remove()">Remove</button>
    `;
    
    // Add event listener for the new input
    const input = patternDiv.querySelector('input');
    input.addEventListener('input', (e) => {
        if (!optionsManager.settings.watchedDomains[domain].patterns) {
            optionsManager.settings.watchedDomains[domain].patterns = [];
        }
        optionsManager.settings.watchedDomains[domain].patterns.push(e.target.value);
    });
    
    patternsContainer.appendChild(patternDiv);
}

// Initialize options manager when DOM is loaded
let optionsManager;
document.addEventListener('DOMContentLoaded', () => {
    optionsManager = new OptionsManager();
});
