// By Bye Tabs - Popup Script
// Handles the popup interface and user interactions

class PopupManager {
    constructor() {
        this.settings = {
            enabled: true,
            countdownSeconds: 6,
            animationsEnabled: true
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
        
    }

    async loadData() {
        try {
            // Load settings
            const savedSettings = await browser.storage.local.get(['enabled', 'countdownSeconds', 'animationsEnabled']);
            if (savedSettings.enabled !== undefined) {
                this.settings.enabled = savedSettings.enabled;
            }
            if (savedSettings.countdownSeconds !== undefined) {
                this.settings.countdownSeconds = savedSettings.countdownSeconds;
            }
            if (savedSettings.animationsEnabled !== undefined) {
                this.settings.animationsEnabled = savedSettings.animationsEnabled;
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


        // Animations toggle
        document.getElementById('animationsToggle').addEventListener('change', (e) => {
            this.settings.animationsEnabled = e.target.checked;
            this.updateSettings();
        });


        document.getElementById('resetStatsBtn').addEventListener('click', () => {
            this.resetStats();
        });

    }

    updateUI() {
        // Update animations toggle
        document.getElementById('animationsToggle').checked = this.settings.animationsEnabled;
        
        // Update stats
        document.getElementById('tabsClosedToday').textContent = this.stats.tabsClosedToday;
        document.getElementById('totalTabsClosed').textContent = this.stats.totalTabsClosed;
    }


    async updateSettings() {
        try {
            await browser.storage.local.set({
                enabled: this.settings.enabled,
                countdownSeconds: this.settings.countdownSeconds,
                animationsEnabled: this.settings.animationsEnabled
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
