// Content script — runs on supported listing sites.
// Listens for messages from the popup and extracts page content.

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action !== "extractContent") return false;

  try {
    const text = document.body.innerText || "";
    const url = window.location.href;
    const title = document.title || "";

    // Extract image URLs from the page (listing photos).
    // Also captures lazy-loaded images via data-src / data-lazy-src / data-original.
    const images = [];
    const seen = new Set();
    document.querySelectorAll("img").forEach((img) => {
      const lazySrc =
        img.getAttribute("data-src") ||
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("data-original");
      const src = lazySrc || img.src;

      if (
        !src ||
        seen.has(src) ||
        src.startsWith("data:") ||
        src.includes("svg") ||
        src.includes("icon") ||
        src.includes("logo") ||
        src.includes("avatar") ||
        src.includes("flag") ||
        src.includes("1x1")
      ) return;

      // Include lazy images unconditionally (they're intentional content).
      // For regular images, require naturalWidth > 100 to skip placeholders.
      if (!lazySrc && img.naturalWidth <= 100) return;

      seen.add(src);
      images.push(src);
    });

    sendResponse({
      success: true,
      data: {
        text: text.substring(0, 50000),
        url: url,
        title: title,
        images: images.slice(0, 20),
      },
    });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }

  return true; // Keep message channel open for async response
});
