// Enhanced content script for automatic React app communication

// Auto-detect React app and establish connection
function initializeExtensionBridge() {
  // Check if this is a React app with focus timer
  const isReactFocusTimer = 
    document.querySelector('[data-testid="focus-timer-app"]') ||
    document.title.includes('Focus Timer') ||
    window.location.href.includes('localhost:3000') ||
    document.querySelector('#root');

  if (isReactFocusTimer) {
    console.log('Focus Timer React app detected, initializing bridge...');
    establishCommunication();
  }
}

function establishCommunication() {
  // Listen for messages from React app
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    switch (event.data.type) {
      case "FOCUS_TIMER_UPDATE":
        handleFocusTimerUpdate(event.data);
        break;
      case "REQUEST_EXTENSION_DATA":
        sendExtensionDataToReact();
        break;
      case "REACT_APP_READY":
        sendExtensionReadySignal();
        break;
    }
  });

  // Auto-notify React that extension is connected
  setTimeout(() => {
    window.postMessage({
      type: "EXTENSION_CONNECTED",
      timestamp: Date.now()
    }, "*");
  }, 1000);

  // Send initial data to React app
  sendExtensionDataToReact();
}

function handleFocusTimerUpdate(data) {
  // Send blocking update to background script
  chrome.runtime.sendMessage({
    action: "updateBlocking",
    blockedSites: data.blockedSites,
    isActive: data.isActive,
    sessionData: data.activeSession
  });

  // Update extension storage
  chrome.storage.local.set({
    activeSession: data.activeSession,
    blockedSites: data.blockedSites,
    timeRemaining: data.timeRemaining,
    lastUpdate: Date.now(),
    reactAppConnected: true
  });
}

function sendExtensionDataToReact() {
  chrome.storage.local.get(null, (data) => {
    window.postMessage({
      type: "EXTENSION_DATA_RESPONSE",
      data: data,
      timestamp: Date.now()
    }, "*");
  });
}

function sendExtensionReadySignal() {
  chrome.storage.local.get(null, (data) => {
    window.postMessage({
      type: "EXTENSION_READY",
      data: data,
      timestamp: Date.now()
    }, "*");
  });
}

// Listen for updates from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extensionReady") {
    sendExtensionReadySignal();
  }
  if (request.action === "blockingUpdated") {
    window.postMessage({
      type: "BLOCKING_STATUS_CHANGED",
      isActive: request.isActive,
      blockedSites: request.blockedSites
    }, "*");
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtensionBridge);
} else {
  initializeExtensionBridge();
}

// Also try after a short delay for React apps
setTimeout(initializeExtensionBridge, 2000);
