const DEFAULT_API_URL = "http://localhost:8000";
const API_ENDPOINT = "/api/v1/extract-data";

const btnAnalyze = document.getElementById("btn-analyze");
const btnAnalyzeAnyway = document.getElementById("btn-analyze-anyway");
const statusEl = document.getElementById("status");
const pageTitleEl = document.getElementById("page-title");
const pageUrlEl = document.getElementById("page-url");
const apiUrlInput = document.getElementById("api-url");
const flagsEl = document.getElementById("flags");

// --- Helpers ---

function setStatus(text, type = "") {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`;
}

function generateSessionId() {
  return crypto.randomUUID();
}

async function getOrCreateSessionId() {
  const result = await chrome.storage.local.get("sessionId");
  if (result.sessionId) return result.sessionId;
  const id = generateSessionId();
  await chrome.storage.local.set({ sessionId: id });
  return id;
}

async function getApiUrl() {
  const result = await chrome.storage.local.get("apiUrl");
  return result.apiUrl || DEFAULT_API_URL;
}

/**
 * Validates that a URL string is a safe HTTP(S) URL.
 * Returns the parsed URL or null if invalid.
 */
function validateHttpUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Checks if an API URL is using insecure HTTP on a non-local host.
 */
function isInsecureRemote(urlString) {
  const parsed = validateHttpUrl(urlString);
  if (!parsed) return false;
  const host = parsed.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  return parsed.protocol === "http:" && !isLocal;
}

/**
 * Checks listing text for common fraud red flags using regex.
 * Returns an array of flag descriptions (empty = no flags detected).
 */
function checkRedFlags(text) {
  const flags = [];

  if (/western\s*union|wire\s*transfer|moneygram/i.test(text)) {
    flags.push("Método de pago sospechoso (Western Union / wire transfer)");
  }
  if (/\b(urgente|urgentísimo|última\s*oportunidad|solo\s*hoy|oferta\s*limitada)\b/i.test(text)) {
    flags.push("Lenguaje de urgencia en el anuncio");
  }
  if (/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i.test(text)) {
    flags.push("Dirección de email en el anuncio");
  }
  if (/wiring|escrow|advance\s*payment|pago\s*anticipado|pago\s*previo/i.test(text)) {
    flags.push("Solicitud de pago adelantado");
  }

  return flags;
}

/**
 * Runs Gemini Nano (chrome.languageModel) locally to score the listing for fraud risk.
 * Returns a number 0-10, or null if the model is unavailable/errors out.
 * Chrome 138+ required; degrades gracefully on older versions.
 */
async function getLocalAIScore(text) {
  if (!chrome.languageModel) return null;

  const availability = await chrome.languageModel.availability();
  // Only run if model is already downloaded — don't block user waiting for download
  if (availability !== "available") return null;

  const session = await chrome.languageModel.create({
    systemPrompt: `Eres un detector de fraude inmobiliario ESTRICTO. Busca activamente señales sutiles de fraude:
precio anormalmente bajo para la zona, descripción genérica o copiada, datos de contacto fuera de la plataforma,
lenguaje de urgencia implícita, propietario que no puede mostrar la propiedad, fotos poco específicas o inconsistentes,
solicitud de pago anticipado, gramática extraña o traducción automática.
Ante la duda, puntúa alto. Es mejor analizar un anuncio legítimo de más que perder a alguien ante un fraude.
0 = sin ninguna señal de alerta, 10 = múltiples señales claras de fraude.
Responde ÚNICAMENTE con el número, sin texto adicional.`,
  });

  try {
    // Truncate to ~1500 chars to stay within Gemini Nano's context window
    const result = await session.prompt(text.substring(0, 1500));
    const score = parseInt(result.trim(), 10);
    return Number.isNaN(score) ? null : Math.min(10, Math.max(0, score));
  } finally {
    session.destroy();
  }
}

/**
 * Uses Gemini Nano to filter a raw list of image URLs down to actual
 * property photos (rooms, exterior, amenities). Returns at most 8 URLs.
 * Falls back to first 8 URLs if the model is unavailable or fails.
 */
async function filterImagesWithLocalAI(images) {
  if (!images.length) return [];

  const MAX = 8;

  if (!chrome.languageModel) return images.slice(0, MAX);
  const availability = await chrome.languageModel.availability().catch(() => null);
  if (availability !== "available") return images.slice(0, MAX);

  const session = await chrome.languageModel.create({
    systemPrompt: `You filter image URLs from rental listing pages.
Given a list of URLs return ONLY the ones that are actual property photos:
rooms, exterior, pool, amenities, common areas.
SKIP: thumbnails (square60, square100, 80x80, 1x1), maps, user avatars,
icons, badges, logos, UI elements, placeholders.
Reply with at most ${MAX} URLs, one per line, no extra text.`,
  });

  try {
    const input = images.slice(0, 40).join("\n");
    const result = await session.prompt(input);
    const filtered = result
      .trim()
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http") && images.includes(u));
    // Need at least 2 valid matches to trust Nano's output
    return filtered.length >= 2 ? filtered.slice(0, MAX) : images.slice(0, MAX);
  } catch {
    return images.slice(0, MAX);
  } finally {
    session.destroy();
  }
}

function showFlags(flags) {
  if (!flagsEl) return;
  flagsEl.innerHTML = "";
  if (flags.length === 0) {
    flagsEl.innerHTML = '<p class="flags-clean">Sin señales de alerta detectadas.</p>';
  } else {
    const ul = document.createElement("ul");
    flags.forEach((f) => {
      const li = document.createElement("li");
      li.textContent = f;
      ul.appendChild(li);
    });
    flagsEl.appendChild(ul);
  }
  flagsEl.style.display = "block";
}

function hideFlags() {
  if (flagsEl) flagsEl.style.display = "none";
}

// --- Core operations ---

async function openApp(extractedData, sourceUrl, apiUrl) {
  const parsedApiUrl = validateHttpUrl(apiUrl);
  if (!parsedApiUrl) throw new Error("URL del servidor no válida.");

  const appOrigin = `${parsedApiUrl.protocol}//${parsedApiUrl.hostname}:5173`;
  const parsedAppUrl = validateHttpUrl(`${appOrigin}/?from_extension=true`);
  if (!parsedAppUrl) throw new Error("No se pudo construir la URL de la aplicación.");

  // Delegate to background service worker — popup context dies when the new tab
  // steals focus, so we can't wait for onUpdated here.
  chrome.runtime.sendMessage({
    type: "OPEN_APP_WITH_DATA",
    appUrl: parsedAppUrl.href,
    payload: { extracted_data: extractedData, source_url: sourceUrl },
  });
}

async function fetchExtractedData(text, url, apiUrl) {
  const parsedApiUrl = validateHttpUrl(apiUrl);
  if (!parsedApiUrl) throw new Error("URL del servidor no válida. Configura una URL http:// o https://.");

  const sessionId = await getOrCreateSessionId();
  const contentWithUrl = `URL del anuncio: ${url}\n\n${text}`;

  const apiResponse = await fetch(`${apiUrl}${API_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      listing_content: contentWithUrl.substring(0, 50000),
    }),
  });

  if (!apiResponse.ok) {
    const err = await apiResponse.json().catch(() => ({}));
    throw new Error(err.detail || `Error del servidor: ${apiResponse.status}`);
  }

  const result = await apiResponse.json();
  return result.extracted_data;
}

// --- Init ---

(async () => {
  const savedUrl = await getApiUrl();
  apiUrlInput.value = savedUrl;

  apiUrlInput.addEventListener("change", () => {
    const url = apiUrlInput.value.trim().replace(/\/+$/, "");
    if (url && !validateHttpUrl(url)) {
      setStatus("URL no válida. Usa http:// o https://", "error");
      return;
    }
    chrome.storage.local.set({ apiUrl: url || DEFAULT_API_URL });
    if (isInsecureRemote(url)) {
      setStatus("Aviso: conexión no segura (HTTP). Usa HTTPS en producción.", "error");
    } else {
      setStatus("", "");
    }
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    pageTitleEl.textContent = tab.title || "Pestaña actual";
    pageUrlEl.textContent = tab.url || "";
  }

  if (isInsecureRemote(savedUrl)) {
    setStatus("Aviso: conexión no segura (HTTP). Usa HTTPS en producción.", "error");
  }
})();

// --- Shared state for "analyze anyway" flow ---
let _pendingText = null;
let _pendingUrl = null;
let _pendingImages = [];

function resetPending() {
  _pendingText = null;
  _pendingUrl = null;
  _pendingImages = [];
}

// Merge images captured by the content script into extracted_data.image_urls.
// Backend Gemini can't extract image URLs from plain text, so we inject them here.
function mergeImages(extractedData, images) {
  if (!images?.length) return extractedData;
  if (extractedData.image_urls?.length) return extractedData; // backend already found some
  return { ...extractedData, image_urls: images };
}

// --- Main action ---

btnAnalyze.addEventListener("click", async () => {
  btnAnalyze.disabled = true;
  btnAnalyzeAnyway.style.display = "none";
  hideFlags();
  resetPending();
  setStatus("Extrayendo contenido de la página...", "loading");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No se pudo acceder a la pestaña activa.");

    // Inject content script if not on a matched site (manual activation)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
    } catch {
      // Already injected via manifest, that's fine
    }

    // Extract content from the page
    const response = await chrome.tabs.sendMessage(tab.id, { action: "extractContent" });
    if (!response?.success) throw new Error(response?.error || "No se pudo extraer el contenido.");

    const { text, url, images: rawImages = [] } = response.data;
    if (!text || text.length < 50) {
      throw new Error("La página no tiene suficiente contenido. Asegúrate de estar en un anuncio.");
    }

    // Filter raw image URLs to actual listing photos using Gemini Nano.
    // Done once here so both the direct path and "analyze anyway" path share the result.
    setStatus("Filtrando imágenes...", "loading");
    const images = await filterImagesWithLocalAI(rawImages);

    const apiUrl = apiUrlInput.value.trim().replace(/\/+$/, "") || DEFAULT_API_URL;

    // Stage 1: Regex red flag filter
    const flags = checkRedFlags(text);
    if (flags.length === 0) {
      // Stage 2: Local AI triaje via Gemini Nano (Chrome 138+, on-device, $0 cost)
      setStatus("Analizando con IA local...", "loading");
      const aiScore = await getLocalAIScore(text).catch(() => null);

      if (aiScore !== null && aiScore > 2) {
        // Nano found risk the regex missed — escalate to backend
        showFlags([`IA local: puntuación de riesgo ${aiScore}/10`]);
        setStatus(`IA local: riesgo ${aiScore}/10. Enviando al servidor...`, "loading");
        const extractedData = await fetchExtractedData(text, url, apiUrl);
        setStatus("Datos extraídos. Abriendo FraudCheck.ai...", "success");
        await openApp(mergeImages(extractedData, images), url, apiUrl);
        return;
      }

      // Neither regex nor local AI found red flags
      showFlags([]);
      const aiNote = aiScore !== null ? ` (IA local: ${aiScore}/10)` : "";
      setStatus(`Sin señales de alerta${aiNote}. ¿Quieres un análisis completo?`, "success");
      _pendingText = text;
      _pendingUrl = url;
      _pendingImages = images;
      btnAnalyzeAnyway.style.display = "block";
      btnAnalyze.disabled = false;
      return;
    }

    showFlags(flags);
    setStatus(
      `${flags.length} señal(es) detectada(s). Enviando al servidor...`,
      "loading"
    );

    // Stage 2: Backend extraction
    const extractedData = await fetchExtractedData(text, url, apiUrl);
    setStatus("Datos extraídos. Abriendo FraudCheck.ai...", "success");
    await openApp(mergeImages(extractedData, images), url, apiUrl);
  } catch (err) {
    setStatus(err.message, "error");
    btnAnalyze.disabled = false;
  }
});

// --- Analyze anyway (when no flags detected but user wants full analysis) ---

btnAnalyzeAnyway.addEventListener("click", async () => {
  if (!_pendingText || !_pendingUrl) return;

  btnAnalyzeAnyway.disabled = true;
  btnAnalyze.disabled = true;
  setStatus("Enviando al servidor...", "loading");

  try {
    const apiUrl = apiUrlInput.value.trim().replace(/\/+$/, "") || DEFAULT_API_URL;
    const extractedData = await fetchExtractedData(_pendingText, _pendingUrl, apiUrl);
    setStatus("Datos extraídos. Abriendo FraudCheck.ai...", "success");
    await openApp(mergeImages(extractedData, _pendingImages), _pendingUrl, apiUrl);
  } catch (err) {
    setStatus(err.message, "error");
    btnAnalyzeAnyway.disabled = false;
    btnAnalyze.disabled = false;
  }
});
