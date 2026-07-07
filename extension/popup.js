const DEFAULT_API_URL = "http://localhost:8000";
const API_ENDPOINT = "/api/v1/extract-data";

const btnAnalyze = document.getElementById("btn-analyze");
const statusEl = document.getElementById("status");
const pageTitleEl = document.getElementById("page-title");
const pageUrlEl = document.getElementById("page-url");
const apiUrlInput = document.getElementById("api-url");

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

// --- Init ---

(async () => {
  const savedUrl = await getApiUrl();
  apiUrlInput.value = savedUrl;

  // Save on change with validation
  apiUrlInput.addEventListener("change", () => {
    const url = apiUrlInput.value.trim().replace(/\/+$/, "");
    if (url && !validateHttpUrl(url)) {
      setStatus("URL no válida. Usa http:// o https://", "error");
      return;
    }
    chrome.storage.local.set({ apiUrl: url || DEFAULT_API_URL });
    // Warn if using HTTP on a remote server
    if (isInsecureRemote(url)) {
      setStatus("Aviso: conexión no segura (HTTP). Usa HTTPS en producción.", "error");
    } else {
      setStatus("", "");
    }
  });

  // Show current page info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    pageTitleEl.textContent = tab.title || "Pestaña actual";
    pageUrlEl.textContent = tab.url || "";
  }

  // Show warning if currently configured with insecure remote
  if (isInsecureRemote(savedUrl)) {
    setStatus("Aviso: conexión no segura (HTTP). Usa HTTPS en producción.", "error");
  }
})();

// --- Main action ---

btnAnalyze.addEventListener("click", async () => {
  btnAnalyze.disabled = true;
  setStatus("Extrayendo contenido de la página...", "loading");

  try {
    // 1. Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No se pudo acceder a la pestaña activa.");

    // 2. Inject content script if not on a matched site (manual activation)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
    } catch {
      // Already injected via manifest, that's fine
    }

    // 3. Extract content from the page
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: "extractContent",
    });

    if (!response?.success) {
      throw new Error(response?.error || "No se pudo extraer el contenido.");
    }

    const { text, url } = response.data;

    if (!text || text.length < 50) {
      throw new Error(
        "La página no tiene suficiente contenido. Asegúrate de estar en un anuncio."
      );
    }

    setStatus(
      `Extraído: ${text.length.toLocaleString()} caracteres. Enviando al servidor...`,
      "loading"
    );

    // 4. Validate and send to backend
    const apiUrl = apiUrlInput.value.trim().replace(/\/+$/, "") || DEFAULT_API_URL;
    const parsedApiUrl = validateHttpUrl(apiUrl);
    if (!parsedApiUrl) {
      throw new Error("URL del servidor no válida. Configura una URL http:// o https://.");
    }

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

    setStatus("Datos extraídos. Abriendo FraudCheck.ai...", "success");

    // 5. Build and validate the app URL before opening
    const appOrigin = apiUrl.replace(/:\d+$/, ":5173");
    const parsedAppUrl = validateHttpUrl(`${appOrigin}/?from_extension=true`);
    if (!parsedAppUrl) {
      throw new Error("No se pudo construir la URL de la aplicación.");
    }

    const newTab = await chrome.tabs.create({ url: parsedAppUrl.href });

    // Wait for the tab to load, then inject data via script
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === newTab.id && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.scripting.executeScript({
          target: { tabId: newTab.id },
          func: (data) => {
            localStorage.setItem("fraudcheck_extension_data", JSON.stringify(data));
            window.location.reload();
          },
          args: [{ extracted_data: result.extracted_data, source_url: url }],
        });
      }
    });
  } catch (err) {
    setStatus(err.message, "error");
    btnAnalyze.disabled = false;
  }
});
