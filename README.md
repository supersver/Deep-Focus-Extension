# Deep Work Focus Timer – Helper Extension

Lightweight Chrome extension that integrates with a React-based Deep Focus Timer app to block distracting websites during active focus sessions using Declarative Net Request (DNR). Runs automatically—no popup UI.

## Features

- Auto-detects the React app and establishes a messaging bridge.
- Updates block rules based on session state via background/service worker.
- Syncs session metadata via chrome.storage.
- Safe permissions: storage, tabs, activeTab, declarativeNetRequest.

## Install

1. Chrome → Extensions → Enable Developer mode.
2. Load unpacked → Select this folder (Deep-Focus-Extension).

No popup is provided; files popup.html and popup.js were removed intentionally.

## Usage

- Open your Deep Focus Timer React app (localhost, 127.0.0.1, _.vercel.app, _.netlify.app, \*.github.io).
- Start/stop sessions in the app; the extension auto-connects and updates blocking.
- Inspect background: chrome://extensions → Service Worker → Inspect.

## Messaging Protocol

From React → Extension (content.js):

- FOCUS_TIMER_UPDATE: { blockedSites, isActive, activeSession, timeRemaining }
- REQUEST_EXTENSION_DATA: request current chrome.storage snapshot
- REACT_APP_READY: signal that the app is initialized

From Extension → React (window.postMessage):

- EXTENSION_CONNECTED: initial handshake
- EXTENSION_DATA_RESPONSE: { data: chrome.storage.local snapshot }
- EXTENSION_READY: sent when extension is ready
- BLOCKING_STATUS_CHANGED: { isActive, blockedSites }

## Permissions

- storage: persist session state and settings
- tabs, activeTab: basic tab context if needed
- declarativeNetRequest: apply/clear blocking rules
- host_permissions: <all_urls> for accurate rule matching

## Development Notes

- content_scripts matches include localhost and common static hosting domains.
- If auto-detection fails, ensure your React app exposes:
  - data-testid="focus-timer-app" or
  - document.title includes "Focus Timer" or
  - #root exists on page
- rules.json is used by DNR; background logic updates rules at runtime.

## License

MIT
