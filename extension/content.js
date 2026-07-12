// Content script — runs on supported listing sites.
// Listens for messages from the popup and extracts page content.

// Text patterns that identify safe "expand" buttons (multi-language).
// We only match informational expanders, never booking/action buttons.
const EXPAND_PATTERNS = [
  /mostrar (más|todo|todas|todos|todas las instalaciones|todas las comodidades)/i,
  /ver (más|todo|todas|todos|descripción completa|más detalles)/i,
  /todas las instalaciones/i,
  /todas las comodidades/i,
  /normas del alojamiento/i,
  /house rules/i,
  /show (more|all|all amenities)/i,
  /read more/i,
  /leer más/i,
  /más información/i,
];

// Click expand/show-more buttons to reveal amenities, house rules,
// full descriptions, etc. before extracting text.
async function expandHiddenContent() {
  document.querySelectorAll("button, [role='button']").forEach((btn) => {
    if (btn.type === "submit" || btn.closest("form")) return;

    const text = (
      (btn.innerText || btn.textContent || "") +
      " " +
      (btn.getAttribute("aria-label") || "")
    ).trim();

    if (EXPAND_PATTERNS.some((p) => p.test(text))) {
      try {
        btn.click();
      } catch {
        // ignore — some buttons throw on programmatic click
      }
    }
  });

  // Wait for modals / expanded sections to render
  await new Promise((r) => setTimeout(r, 800));
}

// Extract image URLs from CSS background-image (gallery carousels, hero photos).
// Many booking sites use background-image instead of <img> for their main photos.
function extractBackgroundImages(seen) {
  const results = [];

  document.querySelectorAll("[style*='background-image']").forEach((el) => {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") return;

    // background can contain multiple url() values
    for (const match of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      const url = match[1];
      if (
        !url ||
        seen.has(url) ||
        url.startsWith("data:") ||
        /svg|icon|logo|avatar|flag|1x1|pixel|blank|spacer/i.test(url)
      )
        continue;
      seen.add(url);
      results.push(url);
    }
  });

  return results;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action !== "extractContent") return false;

  (async () => {
    try {
      // Expand hidden sections BEFORE reading innerText so amenities,
      // house rules and full descriptions are included.
      await expandHiddenContent();

      const text = document.body.innerText || "";
      const url = window.location.href;
      const title = document.title || "";

      const seen = new Set();
      const images = [];

      // 1. <img> tags including lazy-loaded variants
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
          /svg|icon|logo|avatar|flag|1x1/i.test(src)
        )
          return;

        if (!lazySrc && img.naturalWidth <= 100) return;

        seen.add(src);
        images.push(src);
      });

      // 2. CSS background-image (carousel / hero photos)
      images.push(...extractBackgroundImages(seen));

      sendResponse({
        success: true,
        data: {
          text: text.substring(0, 50000),
          url,
          title,
          images: images.slice(0, 30),
        },
      });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // keep message channel open for async response
});
