// Background service worker — persists after popup closes.
// On install/update: purge any stale cache_* keys left by the old cache system.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(null, (items) => {
    const staleKeys = Object.keys(items).filter((k) => k.startsWith("cache_"));
    if (staleKeys.length) chrome.storage.local.remove(staleKeys);
  });
});

// Handles tab creation + script injection so the popup context dying doesn't break the flow.

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "OPEN_APP_WITH_DATA") return;

  const { appUrl, payload } = message;

  chrome.tabs.create({ url: appUrl }, (newTab) => {
    let injected = false;

    function inject() {
      injected = true;
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.scripting
        .executeScript({
          target: { tabId: newTab.id },
          world: "MAIN",
          func: (data) => {
            window.localStorage.setItem(
              "fraudcheck_extension_data",
              JSON.stringify(data)
            );
            window.location.reload();
          },
          args: [payload],
        })
        .catch((err) => console.error("[FraudCheck bg] inject failed:", err));
    }

    function listener(tabId, info) {
      if (tabId === newTab.id && info.status === "complete" && !injected) {
        inject();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);

    // Race condition guard: check if already complete before listener fires
    chrome.tabs.get(newTab.id, (tab) => {
      if (chrome.runtime.lastError || injected) return;
      if (tab.status === "complete") inject();
    });
  });
});
