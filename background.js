// Enhanced background script with better communication
let currentRules = [];

// Listen for messages from the focus timer app
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Extension received message:", request);

  if (request.action === "updateBlocking") {
    updateBlockingRules(request.blockedSites, request.isActive);
    sendResponse({ success: true });
  }

  return true; // Keep message channel open for async response
});

// Listen for extension startup
chrome.runtime.onStartup.addListener(() => {
  checkStorageAndUpdate();
});

chrome.runtime.onInstalled.addListener(() => {
  checkStorageAndUpdate();
});

// Enhanced storage sync
function checkStorageAndUpdate() {
  chrome.storage.local.get(
    ["activeSession", "blockedSites", "syncData", "reactAppConnected"],
    (result) => {
      console.log("Storage check:", result);
      updateBlockingRules(result.blockedSites || [], !!result.activeSession);

      // Auto-notify React app if connected
      if (result.reactAppConnected) {
        notifyReactApp(result);
      }
    }
  );
}

function notifyReactApp(data) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      // Check for React dev server or deployed app
      if (tab.url && (
        tab.url.includes("localhost:3000") ||
        tab.url.includes("localhost:3001") ||
        tab.url.includes("127.0.0.1:3000") ||
        tab.url.includes("vercel.app") ||
        tab.url.includes("netlify.app") ||
        tab.url.includes("github.io")
      )) {
        chrome.tabs.sendMessage(tab.id, {
          action: "extensionReady",
          data: data,
        }).catch(() => {
          // Tab doesn't have content script, ignore
        });
      }
    });
  });
}

function updateBlockingRules(blockedSites, isActive) {
  console.log("Updating blocking rules:", { blockedSites, isActive });

  // Remove existing rules
  const ruleIdsToRemove = currentRules.map((rule) => rule.id);

  if (!isActive || !blockedSites || blockedSites.length === 0) {
    if (ruleIdsToRemove.length > 0) {
      chrome.declarativeNetRequest
        .updateDynamicRules({
          removeRuleIds: ruleIdsToRemove,
        })
        .then(() => {
          console.log("Removed all blocking rules");
          currentRules = [];
        })
        .catch((error) => {
          console.error("Error removing rules:", error);
        });
    }
    return;
  }

  // Create new rules with better blocking
  const newRules = blockedSites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: "redirect",
      redirect: {
        url: `data:text/html,<html><head><title>Site Blocked</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1a202c;margin:0}h1{color:#e53e3e;font-size:3rem;margin-bottom:20px}h2{color:#2d3748;margin-bottom:30px}p{font-size:18px;margin:20px 0;color:#4a5568}button{padding:12px 24px;background:#4299e1;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;margin:10px}button:hover{background:#3182ce}</style></head><body><h1>⊗ Site Blocked</h1><h2>${site}</h2><p>This website is blocked during your focus session.</p><button onclick="window.close()">Close Tab</button><button onclick="window.history.back()">Go Back</button></body></html>`,
      },
    },
    condition: {
      urlFilter: `*://*.${site}/*`,
      resourceTypes: ["main_frame"],
    },
  }));

  // Update rules
  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
      addRules: newRules,
    })
    .then(() => {
      currentRules = newRules;
      console.log("Updated blocking rules successfully:", newRules.length);

      // Update storage with sync timestamp
      chrome.storage.local.set({
        lastSync: Date.now(),
        rulesActive: newRules.length > 0,
      });

      // Notify React app of blocking status change
      notifyReactAppBlockingChange(isActive, blockedSites);
    })
    .catch((error) => {
      console.error("Error updating rules:", error);
    });
}

function notifyReactAppBlockingChange(isActive, blockedSites) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.url && (
        tab.url.includes("localhost") ||
        tab.url.includes("127.0.0.1") ||
        tab.url.includes("vercel.app") ||
        tab.url.includes("netlify.app")
      )) {
        chrome.tabs.sendMessage(tab.id, {
          action: "blockingUpdated",
          isActive: isActive,
          blockedSites: blockedSites
        }).catch(() => {});
      }
    });
  });
}

// Enhanced periodic check with better sync
setInterval(() => {
  chrome.storage.local.get(
    ["activeSession", "blockedSites", "lastUpdate"],
    (result) => {
      const isActive = !!result.activeSession;
      const sites = result.blockedSites || [];

      // Only update if there's a change or if it's been a while
      const currentlyBlocking = currentRules.length > 0;
      const sitesChanged =
        JSON.stringify(sites) !==
        JSON.stringify(
          currentRules.map((r) =>
            r.condition.urlFilter.replace("*://*.", "").replace("/*", "")
          )
        );

      if (isActive !== currentlyBlocking || sitesChanged) {
        updateBlockingRules(sites, isActive);
      }
    }
  );
}, 2000);

// Handle content script connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "focus-timer") {
    port.onMessage.addListener((msg) => {
      if (msg.action === "syncData") {
        chrome.storage.local.get(null, (data) => {
          port.postMessage({ action: "dataSync", data });
        });
      }
    });
  }
});
