// Auto Tab Closer - Content Script
// Detects launcher pages and shows countdown UI

class LauncherDetector {
    constructor() {
        this.countdownUI = null;
        this.isLauncher = false;
        this.userInteracted = false;
        this.init();
    }

    init() {
        // Set up event listeners for user interaction detection
        this.setupInteractionListeners();
        
        // Listen for messages from background script
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleBackgroundMessage(message, sender, sendResponse);
        });

        // Check if this page is already a launcher
        this.checkIfLauncher();
    }

    setupInteractionListeners() {
        const events = ['keydown', 'mousedown', 'pointerdown', 'wheel', 'touchstart', 'scroll'];
        
        events.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.handleUserInteraction();
            }, { passive: true });
        });

        // Watch for clicks on deep link elements
        this.observeDeepLinkClicks();
        
        // Watch for navigation attempts
        this.observeNavigationAttempts();
    }

    observeDeepLinkClicks() {
        // Watch for clicks on elements that might trigger deep links
        document.addEventListener('click', (event) => {
            const target = event.target.closest('a, button, [role="button"]');
            if (target) {
                const href = target.href || target.getAttribute('data-href');
                if (href && this.isDeepLink(href)) {
                    this.handleDeepLinkAttempt(href);
                }
            }
        });

        // Watch for programmatic navigation
        const originalOpen = window.open;
        const originalAssign = window.location.assign;
        const originalReplace = window.location.replace;

        window.open = (...args) => {
            const url = args[0];
            if (this.isDeepLink(url)) {
                this.handleDeepLinkAttempt(url);
            }
            return originalOpen.apply(window, args);
        };

        window.location.assign = (url) => {
            if (this.isDeepLink(url)) {
                this.handleDeepLinkAttempt(url);
            }
            return originalAssign.call(window.location, url);
        };

        window.location.replace = (url) => {
            if (this.isDeepLink(url)) {
                this.handleDeepLinkAttempt(url);
            }
            return originalReplace.call(window.location, url);
        };
    }

    observeNavigationAttempts() {
        // Watch for beforeunload events (user trying to navigate away)
        window.addEventListener('beforeunload', () => {
            this.userInteracted = true;
        });

        // Watch for popstate events (back/forward navigation)
        window.addEventListener('popstate', () => {
            this.userInteracted = true;
        });
    }

    isDeepLink(url) {
        if (!url) return false;
        
        const deepLinkSchemes = [
            'zoommtg://', 'figma://', 'slack://', 'msteams://', 'discord://',
            'skype://', 'whatsapp://', 'telegram://', 'signal://'
        ];
        
        return deepLinkSchemes.some(scheme => url.startsWith(scheme));
    }

    handleDeepLinkAttempt(url) {
        console.log('Deep link attempt detected:', url);
        this.isLauncher = true;
        this.notifyBackgroundScript();
    }

    handleUserInteraction() {
        if (this.userInteracted) return;
        
        this.userInteracted = true;
        this.notifyBackgroundScript();
    }

    notifyBackgroundScript() {
        browser.runtime.sendMessage({
            action: 'userInteraction'
        }).catch(() => {});
    }

    async checkIfLauncher() {
        // Wait a bit for the page to load
        await this.waitForPageLoad();
        
        // Check various indicators
        const indicators = this.getLauncherIndicators();
        
        if (indicators.length > 0) {
            this.isLauncher = true;
            console.log('Launcher page detected:', indicators);
            this.notifyBackgroundScript();
        }
    }

    async waitForPageLoad() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            });
        }
        
        // Additional wait for dynamic content
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    getLauncherIndicators() {
        const indicators = [];
        
        // Check title patterns
        const title = document.title;
        if (title.includes('Launching') || 
            title.includes('Open in app') || 
            title.includes('Redirecting') ||
            title.includes('Please wait')) {
            indicators.push('title_pattern');
        }
        
        // Check for common launcher DOM elements
        const launcherSelectors = [
            '#zoom-ui-frame', '.zoom-ui-frame',
            '.figma-deep-link', '[data-deep-link]',
            '.slack-call-launcher', '.teams-meeting-launcher',
            '.discord-invite-launcher', '.app-launcher',
            '[class*="launch"]', '[class*="redirect"]',
            '[id*="launch"]', '[id*="redirect"]'
        ];
        
        launcherSelectors.forEach(selector => {
            if (document.querySelector(selector)) {
                indicators.push(`dom_element: ${selector}`);
            }
        });
        
        // Check for loading spinners or progress indicators
        const loadingSelectors = [
            '.loading', '.spinner', '.progress',
            '[class*="loading"]', '[class*="spinner"]',
            '[class*="progress"]', '[class*="wait"]'
        ];
        
        loadingSelectors.forEach(selector => {
            if (document.querySelector(selector)) {
                indicators.push(`loading_element: ${selector}`);
            }
        });
        
        // Check for specific text content
        const launcherTexts = [
            'Launching', 'Opening', 'Redirecting', 'Please wait',
            'Open in app', 'Launch app', 'Starting', 'Loading'
        ];
        
        launcherTexts.forEach(text => {
            if (document.body.textContent.includes(text)) {
                indicators.push(`text_content: ${text}`);
            }
        });
        
        return indicators;
    }

    handleBackgroundMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'checkLauncher':
                sendResponse({ isLauncher: this.isLauncher });
                break;
                
            case 'showCountdown':
                this.showCountdownUI(message.seconds, message.domain);
                sendResponse({ success: true });
                break;
                
            case 'updateCountdown':
                this.updateCountdownUI(message.seconds);
                break;
                
            case 'hideCountdown':
                this.hideCountdownUI();
                sendResponse({ success: true });
                break;
        }
    }

    showCountdownUI(seconds, domain) {
        this.hideCountdownUI(); // Remove any existing UI
        
        this.countdownUI = document.createElement('div');
        this.countdownUI.id = 'auto-tab-closer-countdown';
        this.countdownUI.innerHTML = `
            <div class="countdown-content">
                <div class="countdown-header">
                    <span class="countdown-icon">⏰</span>
                    <span class="countdown-title">Auto Tab Closer</span>
                </div>
                <div class="countdown-message">
                    This tab will close in <span class="countdown-timer">${seconds}</span> seconds
                </div>
                <div class="countdown-actions">
                    <button class="keep-tab-btn">Keep Tab Open</button>
                    <button class="close-now-btn">Close Now</button>
                </div>
            </div>
        `;
        
        // Add styles
        this.addCountdownStyles();
        
        // Add event listeners
        this.countdownUI.querySelector('.keep-tab-btn').addEventListener('click', () => {
            browser.runtime.sendMessage({ action: 'keepTabOpen' });
        });
        
        this.countdownUI.querySelector('.close-now-btn').addEventListener('click', () => {
            browser.runtime.sendMessage({ action: 'closeTabNow' });
        });
        
        // Insert into page
        document.body.appendChild(this.countdownUI);
        
        // Animate in
        setTimeout(() => {
            this.countdownUI.classList.add('visible');
        }, 100);
    }

    updateCountdownUI(seconds) {
        if (this.countdownUI) {
            const timerElement = this.countdownUI.querySelector('.countdown-timer');
            if (timerElement) {
                timerElement.textContent = seconds;
            }
        }
    }

    hideCountdownUI() {
        if (this.countdownUI) {
            this.countdownUI.classList.remove('visible');
            setTimeout(() => {
                if (this.countdownUI && this.countdownUI.parentNode) {
                    this.countdownUI.parentNode.removeChild(this.countdownUI);
                }
                this.countdownUI = null;
            }, 300);
        }
    }

    addCountdownStyles() {
        if (document.getElementById('auto-tab-closer-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'auto-tab-closer-styles';
        styles.textContent = `
            #auto-tab-closer-countdown {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                z-index: 999999;
                max-width: 300px;
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
            }
            
            #auto-tab-closer-countdown.visible {
                transform: translateY(0);
                opacity: 1;
            }
            
            .countdown-content {
                padding: 16px;
            }
            
            .countdown-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .countdown-icon {
                font-size: 16px;
                margin-right: 8px;
            }
            
            .countdown-title {
                font-weight: 600;
                color: #333;
            }
            
            .countdown-message {
                color: #666;
                margin-bottom: 12px;
                line-height: 1.4;
            }
            
            .countdown-timer {
                font-weight: 600;
                color: #ff4444;
            }
            
            .countdown-actions {
                display: flex;
                gap: 8px;
            }
            
            .keep-tab-btn, .close-now-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .keep-tab-btn {
                background: #007aff;
                color: white;
            }
            
            .keep-tab-btn:hover {
                background: #0056cc;
            }
            
            .close-now-btn {
                background: #f0f0f0;
                color: #666;
            }
            
            .close-now-btn:hover {
                background: #e0e0e0;
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Initialize the launcher detector
const launcherDetector = new LauncherDetector();
