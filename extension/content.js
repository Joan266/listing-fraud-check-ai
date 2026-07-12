// Content script — runs on supported listing sites.
// Listens for messages from the popup and extracts page content.

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

// URL patterns that identify non-photo assets to skip
const SKIP_URL = /svg|icon|logo|avatar|flag|1x1|pixel|blank|spacer|sprite|placeholder|loading/i;

async function expandHiddenContent() {
  document.querySelectorAll("button, [role='button']").forEach((btn) => {
    if (btn.type === "submit" || btn.closest("form")) return;
    const text = (
      (btn.innerText || btn.textContent || "") + " " +
      (btn.getAttribute("aria-label") || "")
    ).trim();
    if (EXPAND_PATTERNS.some((p) => p.test(text))) {
      try { btn.click(); } catch { /* ignore */ }
    }
  });
  await new Promise((r) => setTimeout(r, 800));
}

// Given a srcset string ("url1 100w, url2 400w, url3 800w"),
// returns the last (largest) URL.
function bestFromSrcset(srcset) {
  if (!srcset) return null;
  const entries = srcset.trim().split(",").map((e) => e.trim().split(/\s+/)[0]).filter(Boolean);
  return entries[entries.length - 1] || null;
}

function addIfPhoto(url, seen, out) {
  if (!url || seen.has(url) || url.startsWith("data:") || SKIP_URL.test(url)) return;
  seen.add(url);
  out.push(url);
}

function extractImgTags(seen) {
  const results = [];
  document.querySelectorAll("img").forEach((img) => {
    // Priority 1: explicit lazy-load attributes (data-src family)
    const lazySrc =
      img.getAttribute("data-src") ||
      img.getAttribute("data-lazy-src") ||
      img.getAttribute("data-original") ||
      img.getAttribute("data-lazy") ||
      img.getAttribute("data-image");
    if (lazySrc) { addIfPhoto(lazySrc, seen, results); return; }

    // Priority 2: srcset / data-srcset — take the largest entry
    const srcset =
      img.getAttribute("srcset") ||
      img.getAttribute("data-srcset");
    const srcsetUrl = bestFromSrcset(srcset);
    if (srcsetUrl) { addIfPhoto(srcsetUrl, seen, results); return; }

    // Priority 3: native src
    // We do NOT filter by naturalWidth — images with loading="lazy" that
    // are off-screen have naturalWidth=0 even though src is a real photo URL.
    if (img.src) addIfPhoto(img.src, seen, results);
  });
  return results;
}

function extractPictureSources(seen) {
  const results = [];
  document.querySelectorAll("picture source").forEach((source) => {
    const srcset =
      source.getAttribute("srcset") ||
      source.getAttribute("data-srcset");
    addIfPhoto(bestFromSrcset(srcset), seen, results);
  });
  return results;
}

function extractBackgroundImages(seen) {
  const results = [];

  // Check both inline style AND likely gallery containers (CSS class based)
  const selectors = [
    "[style*='background-image']",
    "[class*='photo']", "[class*='Photo']",
    "[class*='gallery']", "[class*='Gallery']",
    "[class*='slider']", "[class*='Slider']",
    "[class*='carousel']", "[class*='Carousel']",
    "[class*='cover']", "[class*='Cover']",
    "[class*='hero']", "[class*='Hero']",
    "[data-testid*='photo']",
    "[data-testid*='image']",
    "[data-testid*='gallery']",
  ].join(",");

  document.querySelectorAll(selectors).forEach((el) => {
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === "none") return;
    for (const match of bg.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      addIfPhoto(match[1], seen, results);
    }
  });

  return results;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action !== "extractContent") return false;

  (async () => {
    try {
      await expandHiddenContent();

      const text = document.body.innerText || "";
      const url = window.location.href;
      const title = document.title || "";

      const seen = new Set();
      const images = [
        ...extractImgTags(seen),
        ...extractPictureSources(seen),
        ...extractBackgroundImages(seen),
      ].slice(0, 40);

      sendResponse({
        success: true,
        data: { text: text.substring(0, 50000), url, title, images },
      });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});
