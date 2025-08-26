// Auto Tab Closer - Content Script
// Detects launcher pages and shows countdown UI

class LauncherDetector {
    constructor() {
        this.countdownUI = null;
        this.isLauncher = false;
        this.userInteracted = false;
        this.animationsEnabled = true; // Default to true
        this.isCountdownActive = false; // Prevent duplicate countdowns
        this.currentUrl = window.location.href; // Track current page
        this.lastDeepLinkTime = 0; // Throttle deep link detection
        this.init();
    }

    init() {
        // Set up event listeners for user interaction detection
        this.setupInteractionListeners();
        
        // Listen for messages from background script
        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleBackgroundMessage(message, sender, sendResponse);
        });

        // Check if this page is already a launcher (with small delay to let deep link detection run first)
        setTimeout(() => {
            this.checkIfLauncher();
        }, 100);
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

        // Watch for programmatic navigation using event listeners instead of overriding methods
        this.observeProgrammaticNavigation();
    }

    observeProgrammaticNavigation() {
        // Listen for beforeunload events which often indicate navigation attempts
        window.addEventListener('beforeunload', (event) => {
            // Check if the current page is trying to navigate to a deep link
            if (this.isDeepLink(window.location.href)) {
                this.handleDeepLinkAttempt(window.location.href);
            }
        });

        // Watch for hash changes which might indicate deep link attempts
        window.addEventListener('hashchange', (event) => {
            if (this.isDeepLink(event.newURL)) {
                this.handleDeepLinkAttempt(event.newURL);
            }
        });

        // Monitor for zoom-specific deep link attempts
        this.observeZoomSpecificBehavior();
    }

    observeZoomSpecificBehavior() {
        // Watch for zoom-specific elements and behaviors
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check for zoom-specific elements
                            if (node.id === 'zoom-ui-frame' || 
                                node.classList.contains('zoom-ui-frame') ||
                                node.querySelector('#zoom-ui-frame') ||
                                node.querySelector('.zoom-ui-frame')) {
                                this.handleDeepLinkAttempt('zoommtg://');
                            }
                        }
                    });
                }
            });
        });

        // Wait for document.body to be available before observing
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            // If body doesn't exist yet, wait for it
            const bodyObserver = new MutationObserver(() => {
                if (document.body) {
                    bodyObserver.disconnect();
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                }
            });
            bodyObserver.observe(document.documentElement, {
                childList: true
            });
        }
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
        // Throttle rapid deep link detections
        const now = Date.now();
        if (now - this.lastDeepLinkTime < 500) {
            return; // Skip if less than 500ms since last detection
        }
        this.lastDeepLinkTime = now;
        
        // Reset state if URL changed (new page)
        if (window.location.href !== this.currentUrl) {
            this.resetState();
            this.currentUrl = window.location.href;
        }
        
        // Prevent multiple deep link notifications on same page
        if (this.isLauncher) {
            return;
        }
        
        console.log('Deep link attempt detected:', url);
        this.isLauncher = true;
        this.notifyBackgroundScript('deepLinkAttempt');
    }

    resetState() {
        this.isLauncher = false;
        this.userInteracted = false;
        this.isCountdownActive = false;
        this.lastDeepLinkTime = 0; // Reset throttle
        this.hideCountdownUI();
    }

    handleUserInteraction() {
        if (this.userInteracted) return;
        
        this.userInteracted = true;
        this.hideCountdownUI(); // Hide any active countdown
        this.notifyBackgroundScript();
    }

    notifyBackgroundScript(action = 'userInteraction') {
        console.log('Auto Tab Closer: Sending message to background:', action);
        browser.runtime.sendMessage({
            action: action
        }).then(response => {
            console.log('Auto Tab Closer: Background response:', response);
        }).catch(error => {
            console.error('Auto Tab Closer: Message failed:', error);
        });
    }

    async checkIfLauncher() {
        // Reset state if URL changed (new page)
        if (window.location.href !== this.currentUrl) {
            this.resetState();
            this.currentUrl = window.location.href;
        }
        
        // Skip if already detected as launcher (e.g., by deep link detection)
        if (this.isLauncher) {
            console.log('Auto Tab Closer: Skipping content check - already detected as launcher');
            return;
        }
        
        // Wait a bit for the page to load
        await this.waitForPageLoad();
        
        // Check various indicators
        const indicators = this.getLauncherIndicators();
        
        console.log('Auto Tab Closer: Checking for launcher indicators...');
        console.log('Current URL:', window.location.href);
        console.log('Page title:', document.title);
        console.log('Found indicators:', indicators);
        
        if (indicators.length > 0) {
            this.isLauncher = true;
            console.log('Auto Tab Closer: Launcher page detected:', indicators);
            this.notifyBackgroundScript('launcherDetected');
        } else {
            console.log('Auto Tab Closer: No launcher indicators found');
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
        
        // Check for excluded URLs first
        const url = window.location.href;
        if (url.includes('figma.com/files/')) {
            // This is Figma's file browser, not a launcher page
            return indicators; // Return empty array
        }
        
        // Check title patterns
        const title = document.title;
        if (title.includes('Launching') || 
            title.includes('Open in app') || 
            title.includes('Redirecting') ||
            title.includes('Please wait') ||
            title.includes('Zoom') ||
            title.includes('Meeting')) {
            indicators.push('title_pattern');
        }
        
        // Check for common launcher DOM elements
        const launcherSelectors = [
            '#zoom-ui-frame', '.zoom-ui-frame',
            '.figma-deep-link', '[data-deep-link]',
            '.slack-call-launcher', '.teams-meeting-launcher',
            '.discord-invite-launcher', '.app-launcher',
            '[class*="launch"]', '[class*="redirect"]',
            '[id*="launch"]', '[id*="redirect"]',
            '.zoom-app', '.zoom-launcher', '.zoom-redirect'
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
            '[class*="progress"]', '[class*="wait"]',
            '.zoom-loading', '.zoom-spinner'
        ];
        
        loadingSelectors.forEach(selector => {
            if (document.querySelector(selector)) {
                indicators.push(`loading_element: ${selector}`);
            }
        });
        
        // Check for specific text content
        const launcherTexts = [
            'Launching', 'Opening', 'Redirecting', 'Please wait',
            'Open in app', 'Launch app', 'Starting', 'Loading',
            'Launch Meeting', 'Join Meeting', 'Open Zoom'
        ];
        
        launcherTexts.forEach(text => {
            if (document.body.textContent.includes(text)) {
                indicators.push(`text_content: ${text}`);
            }
        });

        // Check for Zoom-specific URL patterns
        if (window.location.href.includes('zoom.us/j/') || 
            window.location.href.includes('zoom.us/w/') ||
            window.location.href.includes('zoom.us/s/')) {
            indicators.push('zoom_url_pattern');
        }

        // Check for Zoom-specific iframe or redirect elements
        const zoomElements = document.querySelectorAll('iframe, [data-zoom], [class*="zoom"]');
        zoomElements.forEach(element => {
            if (element.src && element.src.includes('zoom')) {
                indicators.push('zoom_iframe: ' + element.src);
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
                this.animationsEnabled = message.animationsEnabled !== undefined ? message.animationsEnabled : true;
                this.showCountdownUI(message.seconds, message.domain);
                sendResponse({ success: true });
                break;
                
            case 'updateCountdown':
                this.animationsEnabled = message.animationsEnabled !== undefined ? message.animationsEnabled : true;
                this.updateCountdownUI(message.seconds, this.animationsEnabled);
                break;
                
            case 'hideCountdown':
                this.hideCountdownUI();
                sendResponse({ success: true });
                break;
        }
    }

    showCountdownUI(seconds, domain) {
        // Prevent duplicate countdowns by checking for existing UI
        if (document.getElementById('auto-tab-closer-countdown')) {
            return;
        }
        
        this.isCountdownActive = true;
        this.hideCountdownUI(); // Remove any existing UI
        
        this.countdownUI = document.createElement('div');
        this.countdownUI.id = 'auto-tab-closer-countdown';
        this.countdownUI.innerHTML = `
            <div class="countdown-content">
                <div class="countdown-header">
                    <span class="countdown-title">By Bye Tabs</span>
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

    updateCountdownUI(seconds, animationsEnabled = true) {
        if (this.countdownUI) {
            const timerElement = this.countdownUI.querySelector('.countdown-timer');
            if (timerElement) {
                timerElement.textContent = seconds;
                
                // Trigger UNHINGED confetti explosion at 2 seconds (only if animations enabled)!
                if (seconds === 2 && animationsEnabled) {
                    this.showConfetti();
                }
            }
        }
    }

    showConfetti() {
        // SCREEN FLASH EFFECT - BLINDING WHITE FLASH!
        this.createScreenFlash();
        
        // SCREEN SHAKE - EARTHQUAKE MODE!
        this.createScreenShake();
        
        // Create MULTIPLE waves of confetti containers for MAXIMUM CHAOS
        for (let wave = 0; wave < 5; wave++) {
            setTimeout(() => {
                this.createConfettiWave(wave);
            }, wave * 200); // Staggered waves for continuous explosion
        }
        
        // BONUS: Slow-mo effect on the countdown UI
        this.countdownUI.style.animation = 'explosion-slowmo 2s ease-out';
    }
    
    createScreenFlash() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
            pointer-events: none;
            z-index: 99999999;
            animation: nuclear-flash 0.5s ease-out;
        `;
        
        const flashStyle = document.createElement('style');
        flashStyle.textContent = `
            @keyframes nuclear-flash {
                0% { opacity: 0; }
                20% { opacity: 1; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(flashStyle);
        document.body.appendChild(flash);
        
        setTimeout(() => {
            if (flash.parentNode) flash.parentNode.removeChild(flash);
            if (flashStyle.parentNode) flashStyle.parentNode.removeChild(flashStyle);
        }, 500);
    }
    
    createScreenShake() {
        const originalTransform = document.body.style.transform;
        const shakeStyle = document.createElement('style');
        shakeStyle.textContent = `
            @keyframes earthquake {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                10% { transform: translate(-10px, -5px) rotate(-1deg); }
                20% { transform: translate(10px, 5px) rotate(1deg); }
                30% { transform: translate(-8px, -3px) rotate(-1deg); }
                40% { transform: translate(8px, 3px) rotate(1deg); }
                50% { transform: translate(-6px, -2px) rotate(-0.5deg); }
                60% { transform: translate(6px, 2px) rotate(0.5deg); }
                70% { transform: translate(-4px, -1px) rotate(-0.5deg); }
                80% { transform: translate(4px, 1px) rotate(0.5deg); }
                90% { transform: translate(-2px, 0px) rotate(0deg); }
            }
            body.shake { animation: earthquake 1s ease-in-out; }
        `;
        document.head.appendChild(shakeStyle);
        document.body.classList.add('shake');
        
        setTimeout(() => {
            document.body.classList.remove('shake');
            if (shakeStyle.parentNode) shakeStyle.parentNode.removeChild(shakeStyle);
            document.body.style.transform = originalTransform;
        }, 1000);
    }
    
    createConfettiWave(waveIndex) {
        const fullConfettiContainer = document.createElement('div');
        fullConfettiContainer.id = `unhinged-confetti-wave-${waveIndex}`;
        fullConfettiContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 9999999;
            overflow: hidden;
        `;
        
        const countdownRect = this.countdownUI.getBoundingClientRect();
        const originX = countdownRect.left + countdownRect.width / 2;
        const originY = countdownRect.top + countdownRect.height / 2;
        
        // ABSOLUTELY UNHINGED CONFETTI COUNT - 400 PER WAVE!!!
        for (let i = 0; i < 400; i++) {
            const confetti = document.createElement('div');
            confetti.className = `unhinged-confetti-${waveIndex}`;
            
            // More extreme size variety
            const size = Math.random() * 20 + 3; // 3-23px - HUGE range!
            
            // EXTREMELY CHAOTIC explosion patterns
            const angle = (Math.PI * 2 * Math.random()) + (Math.random() - 0.5) * Math.PI;
            const velocity = Math.random() * 2000 + 600; // 600-2600px - INSANE speeds!
            const gravity = Math.random() * 800 + 200;
            const spin = Math.random() * 3600 - 1800; // Up to 10 full rotations!
            
            // Random shapes and effects
            const shapes = ['0', '50%', '20% 80%', '0 0 50% 50%'];
            const borderRadius = shapes[Math.floor(Math.random() * shapes.length)];
            
            confetti.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${this.getUnhingedConfettiColor()};
                left: ${originX}px;
                top: ${originY}px;
                border-radius: ${borderRadius};
                box-shadow: 0 0 ${size/2}px ${this.getUnhingedConfettiColor()};
                animation: unhinged-explode-${waveIndex}-${i} ${3 + waveIndex}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
            `;
            
            // COMPLETELY UNHINGED animation with bounces and curves
            const style = document.createElement('style');
            style.textContent = `
                @keyframes unhinged-explode-${waveIndex}-${i} {
                    0% {
                        transform: translate(0, 0) rotate(0deg) scale(1);
                        opacity: 1;
                    }
                    25% {
                        transform: translate(${Math.cos(angle) * velocity * 0.3}px, ${Math.sin(angle) * velocity * 0.3 + gravity * 0.1}px) rotate(${spin * 0.25}deg) scale(1.5);
                        opacity: 1;
                    }
                    50% {
                        transform: translate(${Math.cos(angle) * velocity * 0.7}px, ${Math.sin(angle) * velocity * 0.7 + gravity * 0.5}px) rotate(${spin * 0.6}deg) scale(0.8);
                        opacity: 0.8;
                    }
                    75% {
                        transform: translate(${Math.cos(angle) * velocity * 0.9}px, ${Math.sin(angle) * velocity * 0.9 + gravity * 0.8}px) rotate(${spin * 0.85}deg) scale(0.4);
                        opacity: 0.4;
                    }
                    100% {
                        transform: translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity + gravity}px) rotate(${spin}deg) scale(0.1);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
            
            fullConfettiContainer.appendChild(confetti);
            
            setTimeout(() => {
                if (style.parentNode) style.parentNode.removeChild(style);
            }, (3 + waveIndex) * 1000);
        }
        
        document.body.appendChild(fullConfettiContainer);
        
        setTimeout(() => {
            if (fullConfettiContainer.parentNode) {
                fullConfettiContainer.parentNode.removeChild(fullConfettiContainer);
            }
        }, (3 + waveIndex) * 1000);
    }
    
    getRandomConfettiColor() {
        const colors = ['#8B3C34', '#9D4A42', '#AF5850', '#C1675E', '#D3756C'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    getUnhingedConfettiColor() {
        // More vibrant and crazy colors for UNHINGED mode
        const colors = [
            '#a67c52', '#8b6914', '#d4b896', '#c9a876', '#e6d7bf', // Original beige theme
            '#ff6b35', '#f7931e', '#ffd700', '#ffb347', '#daa520', // Explosive oranges and golds
            '#ff1493', '#ff69b4', '#ffa500', '#ff4500', '#red'     // CHAOTIC accent colors
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    hideCountdownUI() {
        if (this.countdownUI) {
            this.countdownUI.classList.remove('visible');
            setTimeout(() => {
                if (this.countdownUI && this.countdownUI.parentNode) {
                    this.countdownUI.parentNode.removeChild(this.countdownUI);
                }
                this.countdownUI = null;
                this.isCountdownActive = false; // Reset state
            }, 300);
        } else {
            this.isCountdownActive = false; // Reset state even if no UI
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
                background: #f4eeea;
                border: 1px solid #c9a876;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(139, 105, 20, 0.15);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                z-index: 999999;
                max-width: 300px;
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
                overflow: hidden;
            }
            
            #auto-tab-closer-countdown.visible {
                transform: translateY(0);
                opacity: 1;
            }
            
            .countdown-content {
                padding: 16px;
                position: relative;
                z-index: 2;
            }
            
            .countdown-header {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .countdown-title {
                font-weight: 600;
                color: #8B3C34;
            }
            
            .countdown-message {
                color: #8B3C34;
                margin-bottom: 12px;
                line-height: 1.4;
            }
            
            .countdown-timer {
                font-weight: 600;
                color: #6D2E28;
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
                background: #8B3C34;
                color: white;
            }
            
            .keep-tab-btn:hover {
                background: #6D2E28;
            }
            
            .close-now-btn {
                background: #e8dbd1;
                color: #8B3C34;
                border: 1px solid #c9a876;
            }
            
            .close-now-btn:hover {
                background: #c5a88a;
            }
            
            @keyframes explosion-slowmo {
                0% { 
                    transform: scale(1) rotate(0deg);
                    filter: brightness(1) saturate(1);
                }
                50% { 
                    transform: scale(1.2) rotate(5deg);
                    filter: brightness(1.5) saturate(2);
                    box-shadow: 0 0 30px rgba(139, 105, 20, 0.8);
                }
                100% { 
                    transform: scale(1.1) rotate(0deg);
                    filter: brightness(1.2) saturate(1.5);
                    box-shadow: 0 0 20px rgba(139, 105, 20, 0.5);
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Initialize the launcher detector
const launcherDetector = new LauncherDetector();
