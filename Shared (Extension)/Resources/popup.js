// Auto Tab Closer - Popup Script
// Handles the popup interface and user interactions

class PopupManager {
    constructor() {
        this.settings = {
            enabled: true,
            countdownSeconds: 6
        };
        
        this.stats = {
            tabsClosedToday: 0,
            totalTabsClosed: 0
        };
        
        this.init();
    }

    async init() {
        // Load settings and stats
        await this.loadData();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update UI
        this.updateUI();
        
        // Populate domain list
        this.populateDomainList();
    }

    async loadData() {
        try {
            // Load settings
            const savedSettings = await browser.storage.local.get(['enabled', 'countdownSeconds']);
            if (savedSettings.enabled !== undefined) {
                this.settings.enabled = savedSettings.enabled;
            }
            if (savedSettings.countdownSeconds !== undefined) {
                this.settings.countdownSeconds = savedSettings.countdownSeconds;
            }

            // Load stats
            const savedStats = await browser.storage.local.get(['tabsClosedToday', 'totalTabsClosed', 'lastResetDate']);
            if (savedStats.tabsClosedToday !== undefined) {
                this.stats.tabsClosedToday = savedStats.tabsClosedToday;
            }
            if (savedStats.totalTabsClosed !== undefined) {
                this.stats.totalTabsClosed = savedStats.totalTabsClosed;
            }

            // Check if we need to reset daily stats
            await this.checkDailyReset();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async checkDailyReset() {
        const today = new Date().toDateString();
        const lastReset = await browser.storage.local.get('lastResetDate');
        
        if (lastReset.lastResetDate !== today) {
            // Reset daily stats
            this.stats.tabsClosedToday = 0;
            await browser.storage.local.set({
                tabsClosedToday: 0,
                lastResetDate: today
            });
        }
    }

    setupEventListeners() {
        // Enable/disable toggle
        document.getElementById('enabledToggle').addEventListener('change', (e) => {
            this.settings.enabled = e.target.checked;
            this.updateSettings();
        });

        // Countdown input
        document.getElementById('countdownInput').addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 3 && value <= 30) {
                this.settings.countdownSeconds = value;
                this.updateSettings();
            }
        });

        // Action buttons
        document.getElementById('pauseAllBtn').addEventListener('click', () => {
            this.pauseAllTimers();
        });

        document.getElementById('resetStatsBtn').addEventListener('click', () => {
            this.resetStats();
        });

        // Footer links
        document.getElementById('helpLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showHelp();
        });

        document.getElementById('feedbackLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.showFeedback();
        });

        document.getElementById('optionsLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.openOptions();
        });
    }

    updateUI() {
        // Update toggle state
        document.getElementById('enabledToggle').checked = this.settings.enabled;
        
        // Update countdown input
        document.getElementById('countdownInput').value = this.settings.countdownSeconds;
        
        // Update status
        const statusElement = document.getElementById('statusValue');
        statusElement.textContent = this.settings.enabled ? 'Enabled' : 'Disabled';
        statusElement.className = this.settings.enabled ? 'status-value enabled' : 'status-value disabled';
        
        // Update stats
        document.getElementById('tabsClosedToday').textContent = this.stats.tabsClosedToday;
        document.getElementById('totalTabsClosed').textContent = this.stats.totalTabsClosed;
        
        // Update button states
        const pauseBtn = document.getElementById('pauseAllBtn');
        pauseBtn.textContent = this.settings.enabled ? 'Pause All Timers' : 'Resume All Timers';
        pauseBtn.className = this.settings.enabled ? 'action-btn secondary' : 'action-btn primary';
    }

    populateDomainList() {
        const domainList = document.getElementById('domainList');
        const domains = [
            { name: 'zoom.us', description: 'Zoom meetings' },
            { name: 'figma.com', description: 'Figma files' },
            { name: 'slack.com', description: 'Slack calls' },
            { name: 'teams.microsoft.com', description: 'Teams meetings' },
            { name: 'discord.com', description: 'Discord invites' }
        ];

        domainList.innerHTML = '';
        domains.forEach(domain => {
            const domainTag = document.createElement('div');
            domainTag.className = 'domain-tag active';
            domainTag.innerHTML = `
                <span class="domain-name">${domain.name}</span>
                <span class="domain-desc">${domain.description}</span>
            `;
            domainList.appendChild(domainTag);
        });
    }

    async updateSettings() {
        try {
            await browser.storage.local.set({
                enabled: this.settings.enabled,
                countdownSeconds: this.settings.countdownSeconds
            });

            // Send message to background script
            await browser.runtime.sendMessage({
                action: 'updateSettings',
                settings: this.settings
            });

            this.updateUI();
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    }

    async pauseAllTimers() {
        if (this.settings.enabled) {
            // Pause by disabling
            this.settings.enabled = false;
        } else {
            // Resume by enabling
            this.settings.enabled = true;
        }
        
        await this.updateSettings();
    }

    async resetStats() {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            this.stats.tabsClosedToday = 0;
            this.stats.totalTabsClosed = 0;
            
            try {
                await browser.storage.local.set({
                    tabsClosedToday: 0,
                    totalTabsClosed: 0,
                    lastResetDate: new Date().toDateString()
                });
                
                this.updateUI();
            } catch (error) {
                console.error('Error resetting stats:', error);
            }
        }
    }

    showHelp() {
        const helpText = `
Auto Tab Closer Help

This extension automatically closes tabs that are used to launch native apps (like Zoom or Figma) after they become useless.

How it works:
1. Detects when you visit a launcher page
2. Shows a countdown timer
3. Automatically closes the tab unless you interact with it
4. You can cancel the auto-close at any time

Supported sites:
• Zoom (zoom.us) - Meeting launchers
• Figma (figma.com) - File launchers  
• Slack (slack.com) - Call launchers
• Teams (teams.microsoft.com) - Meeting launchers
• Discord (discord.com) - Invite launchers

Settings:
• Enable/disable the feature
• Adjust countdown time (3-30 seconds)
• View statistics
• Advanced configuration via Options page

The extension only closes tabs that appear to be launcher pages. It won't close tabs you're actively using.

For advanced settings, click the "Options" link in the footer.
        `;
        
        alert(helpText);
    }

    showFeedback() {
        // Open feedback form or email
        const email = 'feedback@autotabcloser.com';
        const subject = 'Auto Tab Closer Feedback';
        const body = 'Please provide your feedback about the Auto Tab Closer extension:';
        
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoLink);
    }

    openOptions() {
        browser.runtime.openOptionsPage();
    }

    // Method to update stats when tabs are closed
    async incrementStats() {
        this.stats.tabsClosedToday++;
        this.stats.totalTabsClosed++;
        
        try {
            await browser.storage.local.set({
                tabsClosedToday: this.stats.tabsClosedToday,
                totalTabsClosed: this.stats.totalTabsClosed
            });
            
            this.updateUI();
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const popupManager = new PopupManager();
    
    // Listen for stats updates from background script
    browser.runtime.onMessage.addListener((message) => {
        if (message.action === 'tabClosed') {
            popupManager.incrementStats();
        }
    });
});
