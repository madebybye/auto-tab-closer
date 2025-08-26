# Auto Tab Closer

A Safari Web Extension that automatically closes tabs that are only used to launch native apps (like Zoom, Figma, Slack, Teams, and Discord) after they become useless.

## Features

### Core Functionality
- **Automatic Detection**: Identifies launcher pages based on URL patterns, page content, and user interactions
- **Smart Countdown**: Shows a visible countdown before closing tabs (configurable 3-30 seconds)
- **User Control**: Provides options to cancel auto-close or close immediately
- **Safety First**: Cancels auto-close if user interacts with the page

### Supported Applications
- **Zoom** (`zoom.us`) - Meeting launchers and join pages
- **Figma** (`figma.com`) - File launchers and "Open in app" pages
- **Slack** (`slack.com`) - Call launchers
- **Microsoft Teams** (`teams.microsoft.com`) - Meeting launchers
- **Discord** (`discord.com`) - Invite launchers

### User Interface
- **Toolbar Popup**: Quick access to settings and statistics
- **Options Page**: Advanced configuration and domain management
- **In-Page Notifications**: Unobtrusive countdown UI with action buttons
- **Extension Badge**: Shows countdown timer in toolbar

## Installation

### From Xcode (Development)
1. Open the project in Xcode
2. Select your target device/simulator
3. Build and run the project
4. The extension will be installed and can be enabled in Safari

### From App Store (Future)
- The extension will be available for download once published

## Usage

### Basic Operation
1. **Install and Enable**: Install the extension and enable it in Safari
2. **Automatic Detection**: Visit a supported launcher page (e.g., Zoom meeting link)
3. **Countdown**: A countdown timer will appear in the bottom-right corner
4. **Auto-Close**: The tab will automatically close after the countdown expires
5. **User Control**: Click "Keep Tab Open" to cancel or "Close Now" to close immediately

### Configuration
- **Enable/Disable**: Toggle the feature on/off from the toolbar popup
- **Countdown Time**: Adjust the auto-close delay (3-30 seconds)
- **Domain Management**: Configure which sites to watch and their patterns
- **Advanced Settings**: Access via the Options page

## Technical Details

### Architecture
- **Background Script**: Manages tab monitoring, timers, and settings
- **Content Script**: Detects launcher pages and shows UI
- **Popup Interface**: Toolbar popup for quick settings
- **Options Page**: Advanced configuration interface

### Detection Methods
1. **URL Patterns**: Matches known launcher URL structures
2. **Page Content**: Looks for launcher-specific text and DOM elements
3. **Deep Link Attempts**: Monitors for app scheme redirects
4. **User Interaction**: Tracks mouse, keyboard, and touch events

### Safety Features
- **Interaction Detection**: Cancels auto-close on any user activity
- **Navigation Monitoring**: Watches for page changes and navigation attempts
- **Configurable Delays**: Allows time for pages to load and stabilize
- **User Override**: Always respects user choices to keep tabs open

## Configuration

### Basic Settings
- **Enabled**: Master toggle for the extension
- **Countdown Seconds**: Time before auto-close (3-30 seconds)
- **Check Delay**: Delay before checking if page is a launcher

### Domain Configuration
Each supported domain can be configured with:
- **URL Patterns**: Specific URL structures to watch
- **Title Patterns**: Page title patterns that indicate launcher pages
- **DOM Markers**: HTML elements that suggest launcher functionality
- **Deep Link Schemes**: App schemes that trigger launcher behavior

### Advanced Options
- **Logging Level**: Control console output verbosity
- **Daily Limits**: Maximum tabs closed per day
- **Notifications**: Desktop notifications when tabs are closed
- **User Choice Memory**: Remember user preferences per domain

## Development

### Project Structure
```
Shared (Extension)/Resources/
├── manifest.json          # Extension manifest
├── background.js          # Background script
├── content.js            # Content script
├── popup.html            # Toolbar popup
├── popup.css             # Popup styles
├── popup.js              # Popup functionality
├── options.html          # Options page
├── options.js            # Options functionality
└── images/               # Extension icons
```

### Building
1. Open `Auto Tab Closer.xcodeproj` in Xcode
2. Select your target (iOS/macOS)
3. Build and run the project
4. The extension will be built and can be installed

### Testing
- Test with various launcher pages (Zoom, Figma, etc.)
- Verify countdown UI appears correctly
- Test user interaction cancellation
- Verify settings persistence

## Browser Compatibility

- **Safari**: Full support (primary target)
- **Chrome**: Compatible with WebExtension API
- **Firefox**: Compatible with WebExtension API
- **Edge**: Compatible with WebExtension API

## Privacy & Security

- **No Data Collection**: The extension doesn't collect or transmit user data
- **Local Storage**: All settings and statistics are stored locally
- **No Tracking**: No analytics or tracking code included
- **Open Source**: Full source code available for review

## Contributing

### Development Setup
1. Fork the repository
2. Clone your fork locally
3. Open in Xcode
4. Make your changes
5. Test thoroughly
6. Submit a pull request

### Code Style
- Use ES6+ JavaScript features
- Follow consistent naming conventions
- Include JSDoc comments for functions
- Maintain clean, readable code

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

### Documentation
- This README provides comprehensive usage information
- In-app help is available via the popup interface
- Options page includes detailed configuration options

### Issues
- Report bugs via GitHub Issues
- Include detailed reproduction steps
- Provide system and browser information

### Feature Requests
- Submit feature requests via GitHub Issues
- Describe the use case and expected behavior
- Consider contributing implementation

## Roadmap

### Planned Features
- **Additional Apps**: Support for more launcher applications
- **Custom Rules**: User-defined launcher detection patterns
- **Cloud Sync**: Settings synchronization across devices
- **Analytics Dashboard**: Detailed usage statistics and insights
- **Keyboard Shortcuts**: Quick actions via keyboard commands

### Future Enhancements
- **Machine Learning**: Improved launcher detection accuracy
- **Performance Optimization**: Faster detection and response
- **Accessibility**: Enhanced screen reader and keyboard support
- **Internationalization**: Multi-language support

## Acknowledgments

- Built with modern web technologies
- Designed for Safari Web Extensions
- Inspired by the need to manage launcher tabs efficiently
- Community feedback and testing contributions

---

**Auto Tab Closer** - Making your browsing experience cleaner, one launcher tab at a time.

## Quick Start

1. **Build in Xcode**: Open the project and build for your target platform
2. **Install Extension**: The extension will be available in Safari
3. **Visit Launcher Pages**: Go to Zoom meetings, Figma files, etc.
4. **Automatic Detection**: Extension detects launcher pages and starts countdown
5. **User Choice**: Let it auto-close or click 'Keep Tab Open'

## Quick Start
