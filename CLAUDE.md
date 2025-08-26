# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Auto Tab Closer is a Safari Web Extension built with Xcode that automatically closes tabs used to launch native apps (Zoom, Figma, Slack, Teams, Discord). The project targets both iOS and macOS platforms using shared code architecture.

## Build Commands

### Development
```bash
# Open project in Xcode
open "Auto Tab Closer.xcodeproj"
```

### Building
- Open `Auto Tab Closer.xcodeproj` in Xcode
- Select target: iOS/macOS
- Build and run (⌘+R)
- Extension will be built and available for installation in Safari

### Testing
- Test with launcher pages from supported domains (zoom.us, figma.com, slack.com, teams.microsoft.com, discord.com)
- Verify countdown UI appears and functions correctly
- Test user interaction cancellation behavior
- Check settings persistence across browser sessions

## Architecture

### Core Components
- **Background Script** (`background.js`): Tab monitoring, timer management, settings storage
- **Content Script** (`content.js`): Launcher page detection, countdown UI, user interaction tracking
- **Safari Extension Handler** (`SafariWebExtensionHandler.swift`): Native app communication bridge
- **UI Components**: Popup interface (`popup.js/html/css`), Options page (`options.js/html`)

### Detection System
The extension uses a multi-layered detection approach:
1. **URL Pattern Matching**: Matches against known launcher URL structures for each domain
2. **Page Content Analysis**: Searches for launcher-specific DOM elements and title patterns
3. **Deep Link Detection**: Monitors for app scheme redirects (zoommtg://, figma://, etc.)
4. **User Interaction Tracking**: Cancels auto-close on any user activity

### Shared Code Structure
```
Shared (Extension)/Resources/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js            # Injected page detection
├── popup.html/js/css     # Toolbar popup interface
├── options.html/js       # Settings configuration page
└── images/               # Extension icons
```

### Domain Configuration
Each supported domain (`zoom.us`, `figma.com`, etc.) has configurable:
- URL patterns for launcher page matching
- Title patterns for page identification
- DOM markers for content-based detection
- Deep link schemes for app launching detection

### Settings Management
- Stored locally using browser.storage.local API
- Master enable/disable toggle
- Configurable countdown duration (3-30 seconds)
- Per-domain configuration options
- User choice memory for keeping tabs open

## Development Notes

### Browser API Usage
- Uses Manifest V3 WebExtension APIs
- Requires `tabs`, `storage`, `activeTab` permissions
- Host permissions for all supported domains
- Content scripts run at `document_start` for early detection

### Safety Features
- User interaction cancels auto-close immediately
- Navigation monitoring prevents closing during page changes
- Configurable delays allow pages to load and stabilize
- User override always respected

### Cross-Platform Compatibility
- Swift code handles Safari-specific extension integration
- JavaScript WebExtension APIs provide cross-browser compatibility
- Xcode project structure supports both iOS and macOS targets