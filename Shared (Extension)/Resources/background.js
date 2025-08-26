// Auto Tab Closer - Background Script
// Handles tab monitoring, launcher detection, and auto-closing logic

class AutoTabCloser {
    constructor() {
        this.settings = {
            enabled: true,
            countdownSeconds: 6,
            watchedDomains: {
                'zoom.us': {
                    patterns: ['*://*.zoom.us/j/*', '*://*.zoom.us/w/*', '*://*.zoom.us/s/*'],
                    titlePatterns: [/^Launching.*Zoom/i, /^Zoom.*Launching/i],
                    domMarkers: ['#zoom-ui-frame', '.zoom-ui-frame'],
                    deepLinkSchemes: ['zoommtg://']
                },
                'figma.com': {
                    patterns: ['*://*.figma.com/file/*'],
                    titlePatterns: [/Open in app/i, /Launch.*Figma/i],
                    domMarkers: ['.figma-deep-link', '[data-deep-link]'],
                    deepLinkSchemes: ['figma://']
                },
                'slack.com': {
                    patterns: ['*://*.slack.com/call/*'],
                    titlePatterns: [/Launching.*Slack/i, /Slack.*Call/i],
                    domMarkers: ['.slack-call-launcher'],
                    deepLinkSchemes: ['slack://']
                },
                'teams.microsoft.com': {
                    patterns: ['*://*.teams.microsoft.com/meet/*'],
                    titlePatterns: [/Launching.*Teams/i, /Teams.*Meeting/i],
                    domMarkers: ['.teams-meeting-launcher'],
                    deepLinkSchemes: ['msteams://']
                },
                'discord.com': {
                    patterns: ['*://*.discord.com/invite/*'],
                    titlePatterns: [/Launching.*Discord/i, /Discord.*Invite/i],
                    domMarkers: ['.discord-invite-launcher'],
                    deepLinkSchemes: ['discord://']
                }
            }
        };
        
        this.activeTabs = new Map(); // tabId -> { timer, countdown, domain }
        this.init();
    }

    async init() {
        // Load saved settings
        const saved = await browser.storage.local.get(['enabled', 'countdownSeconds']);
        if (saved.enabled !== undefined) this.settings.enabled = saved.enabled;
        if (saved.countdownSeconds !== undefined) this.settings.countdownSeconds = saved.countdownSeconds;

        // Set up event listeners
        this.setupEventListeners();
        
        // Check existing tabs
        this.checkExistingTabs();
    }

    setupEventListeners() {
        // Listen for tab updates
        browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.checkTabForLauncher(tabId, tab);
            }
        });

        // Listen for tab removal
        browser.tabs.onRemoved.addListener((tabId) => {
            this.cancelTabTimer(tabId);
        });

        // Listen for tab activation
        browser.tabs.onActivated.addListener((activeInfo) => {
            this.handleTabActivation(activeInfo.tabId);
        });

        // Listen for messages from content scripts
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleContentScriptMessage(message, sender, sendResponse);
        });

        // Listen for storage changes
        browser.storage.onChanged.addListener((changes) => {
            this.handleStorageChanges(changes);
        });
    }

    async checkExistingTabs() {
        const tabs = await browser.tabs.query({});
        for (const tab of tabs) {
            if (tab.url) {
                this.checkTabForLauncher(tab.id, tab);
            }
        }
    }

    checkTabForLauncher(tabId, tab) {
        if (!this.settings.enabled || !tab.url) return;

        const url = new URL(tab.url);
        const domain = this.getDomainFromUrl(url.hostname);
        
        if (!domain || !this.settings.watchedDomains[domain]) return;

        const domainConfig = this.settings.watchedDomains[domain];
        
        // Check if URL matches patterns
        const urlMatches = domainConfig.patterns.some(pattern => 
            this.matchesPattern(tab.url, pattern)
        );

        if (urlMatches) {
            // Schedule a check after a short delay to allow page to load
            setTimeout(() => {
                this.scheduleTabCheck(tabId, domain);
            }, 1000);
        }
    }

    async scheduleTabCheck(tabId, domain) {
        try {
            // Send message to content script to check for launcher indicators
            const response = await browser.tabs.sendMessage(tabId, {
                action: 'checkLauncher',
                domain: domain,
                config: this.settings.watchedDomains[domain]
            });

            if (response && response.isLauncher) {
                this.startAutoCloseCountdown(tabId, domain);
            }
        } catch (error) {
            // Content script not ready or tab closed
            console.log('Could not check tab for launcher:', error);
        }
    }

    startAutoCloseCountdown(tabId, domain) {
        // Cancel any existing timer
        this.cancelTabTimer(tabId);

        const countdown = this.settings.countdownSeconds;
        let remaining = countdown;

        // Update badge to show countdown
        this.updateBadge(tabId, remaining);

        // Send message to content script to show countdown UI
        browser.tabs.sendMessage(tabId, {
            action: 'showCountdown',
            seconds: remaining,
            domain: domain
        }).catch(() => {});

        const timer = setInterval(() => {
            remaining--;
            
            if (remaining <= 0) {
                this.closeTab(tabId);
                return;
            }

            // Update badge
            this.updateBadge(tabId, remaining);

            // Update content script countdown
            browser.tabs.sendMessage(tabId, {
                action: 'updateCountdown',
                seconds: remaining
            }).catch(() => {});
        }, 1000);

        // Store timer info
        this.activeTabs.set(tabId, {
            timer: timer,
            countdown: countdown,
            domain: domain,
            startTime: Date.now()
        });
    }

    cancelTabTimer(tabId) {
        const tabInfo = this.activeTabs.get(tabId);
        if (tabInfo) {
            clearInterval(tabInfo.timer);
            this.activeTabs.delete(tabId);
            this.updateBadge(tabId, null);
            
            // Hide countdown UI
            browser.tabs.sendMessage(tabId, {
                action: 'hideCountdown'
            }).catch(() => {});
        }
    }

    async closeTab(tabId) {
        try {
            await browser.tabs.remove(tabId);
            this.activeTabs.delete(tabId);
            
            // Update statistics
            await this.updateStats();
        } catch (error) {
            console.log('Could not close tab:', error);
        }
    }

    async updateStats() {
        try {
            const current = await browser.storage.local.get(['tabsClosedToday', 'totalTabsClosed', 'lastResetDate']);
            
            const today = new Date().toDateString();
            let tabsClosedToday = (current.tabsClosedToday || 0) + 1;
            const totalTabsClosed = (current.totalTabsClosed || 0) + 1;
            
            // Reset daily count if it's a new day
            if (current.lastResetDate !== today) {
                tabsClosedToday = 1;
            }
            
            await browser.storage.local.set({
                tabsClosedToday: tabsClosedToday,
                totalTabsClosed: totalTabsClosed,
                lastResetDate: today
            });
        } catch (error) {
            console.log('Error updating stats:', error);
        }
    }

    updateBadge(tabId, countdown) {
        if (countdown === null) {
            browser.action.setBadgeText({ text: '' });
        } else {
            browser.action.setBadgeText({ text: countdown.toString() });
            browser.action.setBadgeBackgroundColor({ color: '#FF4444' });
        }
    }

    handleTabActivation(tabId) {
        // Cancel auto-close if user activates the tab
        if (this.activeTabs.has(tabId)) {
            this.cancelTabTimer(tabId);
        }
    }

    handleContentScriptMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'userInteraction':
                // User interacted with the page, cancel auto-close
                this.cancelTabTimer(sender.tab.id);
                sendResponse({ success: true });
                break;

            case 'keepTabOpen':
                // User clicked "Keep tab open" button
                this.cancelTabTimer(sender.tab.id);
                sendResponse({ success: true });
                break;

            case 'closeTabNow':
                // User clicked "Close Now" button
                this.closeTab(sender.tab.id);
                sendResponse({ success: true });
                break;

            case 'getSettings':
                sendResponse({ settings: this.settings });
                break;

            case 'updateSettings':
                this.updateSettings(message.settings);
                sendResponse({ success: true });
                break;
        }
    }

    async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        await browser.storage.local.set({
            enabled: this.settings.enabled,
            countdownSeconds: this.settings.countdownSeconds
        });
    }

    handleStorageChanges(changes) {
        if (changes.enabled) {
            this.settings.enabled = changes.enabled.newValue;
        }
        if (changes.countdownSeconds) {
            this.settings.countdownSeconds = changes.countdownSeconds.newValue;
        }
    }

    getDomainFromUrl(hostname) {
        for (const domain of Object.keys(this.settings.watchedDomains)) {
            if (hostname.endsWith(domain)) {
                return domain;
            }
        }
        return null;
    }

    matchesPattern(url, pattern) {
        if (pattern.startsWith('*://')) {
            const urlPattern = pattern.replace('*://', 'https://');
            return url.startsWith(urlPattern);
        }
        return url.includes(pattern);
    }
}

// Initialize the auto tab closer
const autoTabCloser = new AutoTabCloser();
