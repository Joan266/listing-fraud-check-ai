export type Lang = 'es' | 'en';

export interface LandingT {
  nav: { comoFunciona: string; extension: string; verificaciones: string; stack: string; cta: string };
  hero: {
    badge: string;
    titleBefore: string;
    titleAccent: string;
    titleAfter: string;
    subtitle: string;
    cta1: string;
    cta2: string;
    trust: [string, string, string];
  };
  stats: Array<{ value: string; label: string }>;
  como: {
    label: string;
    title: string;
    subtitle: string;
    steps: Array<{ title: string; body: string }>;
  };
  ext: {
    label: string;
    title: string;
    subtitle: string;
    bullets: Array<{ title: string; body: string }>;
    cta: string;
    note: string;
  };
  capas: {
    label: string;
    title: string;
    subtitle: string;
    features: Array<{ title: string; body: string }>;
  };
  form: {
    label: string;
    title: string;
    subtitle: string;
    modeText: string;
    modeUrl: string;
    placeholder: string;
    placeholderUrl: string;
    submit: string;
    extracting: string;
    extractingUrl: string;
    privacy: string;
    skip: string;
    useExample: string;
  };
  stack: { label: string; title: string; award: string; subtitle: string };
  footer: { tagline: string; portfolio: string };
}

export const translations: Record<Lang, LandingT> = {
  es: {
    nav: {
      comoFunciona: 'Cómo funciona',
      extension: 'Extensión',
      verificaciones: 'Verificaciones',
      stack: 'Stack',
      cta: 'Verificar anuncio',
    },
    hero: {
      badge: 'Detección de fraude en alquileres con IA',
      titleBefore: 'Quítate las',
      titleAccent: 'dudas',
      titleAfter: 'antes de reservar',
      subtitle:
        'Instala la extensión y NoPiques extrae los datos del anuncio automáticamente, los analiza con Gemini IA en segundos y te da un informe claro con cada señal explicada.',
      cta1: 'Descargar extensión',
      cta2: 'Probar la demo',
      trust: ['Gratis', 'Sin registro', 'Informe en menos de 2 min'],
    },
    stats: [
      { value: '6', label: 'capas de verificación por anuncio' },
      { value: '< 2 min', label: 'de media para un informe completo' },
      { value: '100%', label: 'explicado — cada señal, justificada' },
    ],
    como: {
      label: 'Cómo funciona',
      title: 'Tres pasos, un veredicto claro',
      subtitle: '',
      steps: [
        {
          title: 'Abre el anuncio',
          body: 'En cualquier portal, la extensión detecta el anuncio y extrae los datos automáticamente.',
        },
        {
          title: 'La IA ejecuta las verificaciones',
          body: 'Seis capas independientes analizan dirección, precio, fotos, anfitrión, zona y URL en paralelo.',
        },
        {
          title: 'Recibe tu informe',
          body: 'Una puntuación de riesgo clara con cada señal de alerta explicada y justificada.',
        },
      ],
    },
    ext: {
      label: 'Extensión de navegador',
      title: 'Analiza el anuncio sin salir de la web',
      subtitle:
        'Añádela a Chrome y, en cualquier portal, NoPiques detecta el anuncio, extrae los datos y te avisa al instante si algo no cuadra.',
      bullets: [
        {
          title: 'Extracción automática',
          body: 'Lee dirección, precio, fotos y anfitrión de la página activa sin copiar y pegar.',
        },
        {
          title: '10+ portales soportados',
          body: 'Idealista, Fotocasa, Airbnb, Booking, Wallapop, Milanuncios y más — la extensión detecta el anuncio automáticamente.',
        },
        {
          title: 'Aviso en tiempo real',
          body: 'El popup te muestra las señales de alerta al instante, sin cambiar de página ni copiar nada.',
        },
      ],
      cta: 'Añadir a Chrome',
      note: 'Beta · vía GitHub',
    },
    capas: {
      label: 'Bajo el capó',
      title: 'Seis capas de verificación',
      subtitle: 'Cada anuncio pasa por seis análisis independientes. Ninguna señal se queda sin explicar.',
      features: [
        {
          title: 'Verificación de dirección',
          body: 'Comprobamos con Google Maps que la dirección existe y las coordenadas coinciden con la ubicación declarada.',
        },
        {
          title: 'Análisis de precio',
          body: 'Comparado con precios de mercado de la zona para detectar precios sospechosamente bajos diseñados para atraer víctimas.',
        },
        {
          title: 'Detección de patrones de estafa',
          body: 'Comparado con tácticas de fraude conocidas, presión de urgencia y señales de alerta comunes.',
        },
        {
          title: 'Análisis forense de imágenes',
          body: 'Búsqueda inversa y análisis para detectar fotos robadas, duplicadas o generadas por IA.',
        },
        {
          title: 'Análisis del barrio',
          body: 'Contexto local verificado: servicios cercanos, conexiones de transporte y reputación de la zona.',
        },
        {
          title: 'Verificación de URL y anfitrión',
          body: 'Antigüedad del dominio, datos de registro y perfil del anfitrión verificados para confirmar autenticidad.',
        },
      ],
    },
    form: {
      label: 'Pruébalo ahora',
      title: 'Verifica un anuncio',
      subtitle: 'Pega el texto de un anuncio real o usa nuestro ejemplo para ver un informe completo.',
      modeText: 'Pegar texto',
      modeUrl: 'Pegar URL',
      placeholder: 'Pega aquí el texto del anuncio de alquiler…\n\nConsejo: Ctrl+A para seleccionar todo, Ctrl+C para copiar, Ctrl+V para pegar.',
      placeholderUrl: 'https://www.idealista.com/inmueble/12345678 o cualquier URL de anuncio',
      submit: 'Verificar mi anuncio',
      extracting: 'Extrayendo…',
      extractingUrl: 'Extrayendo datos…',
      privacy: '',
      skip: 'o salta y rellena el formulario manualmente',
      useExample: 'Usar ejemplo con estafa',
    },
    stack: {
      label: 'Bajo el capó · ingeniería',
      title: 'Stack tecnológico',
      award: 'Construido para los Google Maps Platform Awards',
      subtitle:
        'Inteligencia de ubicación real vía Geocoding, Places y Maps JavaScript API, análisis con Gemini, y colas de trabajos en paralelo con Redis + RQ.',
    },
    footer: {
      tagline: 'Detección de fraude en alquileres con IA',
      portfolio: 'Proyecto portfolio',
    },
  },

  en: {
    nav: {
      comoFunciona: 'How it works',
      extension: 'Extension',
      verificaciones: 'Checks',
      stack: 'Stack',
      cta: 'Check a listing',
    },
    hero: {
      badge: 'AI rental fraud detection',
      titleBefore: 'Verify',
      titleAccent: 'before',
      titleAfter: 'you book',
      subtitle:
        'Install the extension and NoPiques pulls the listing data automatically, analyses it with Gemini AI in seconds and gives you a clear report with every signal explained.',
      cta1: 'Get the extension',
      cta2: 'Try the demo',
      trust: ['Free', 'No sign-up', 'Report in under 2 min'],
    },
    stats: [
      { value: '6', label: 'verification layers per listing' },
      { value: '< 2 min', label: 'on average for a full report' },
      { value: '100%', label: 'explained — every signal justified' },
    ],
    como: {
      label: 'How it works',
      title: 'Three steps, one clear verdict',
      subtitle: '',
      steps: [
        {
          title: 'Open the listing',
          body: 'On any portal, the extension detects the listing and extracts the data automatically.',
        },
        {
          title: 'AI runs the checks',
          body: 'Six independent layers analyse the address, price, photos, host, neighbourhood and URL in parallel.',
        },
        {
          title: 'Get your report',
          body: 'A clear risk score with every red flag explained and justified.',
        },
      ],
    },
    ext: {
      label: 'Browser extension',
      title: 'Analyse the listing without leaving the page',
      subtitle:
        'Add it to Chrome and, on any portal, NoPiques detects the listing, extracts the data and alerts you instantly if something looks off.',
      bullets: [
        {
          title: 'Automatic extraction',
          body: 'Reads the address, price, photos and host from the active page — no copy-pasting.',
        },
        {
          title: '10+ portals supported',
          body: 'Idealista, Fotocasa, Airbnb, Booking, Wallapop and more — the extension detects the listing automatically.',
        },
        {
          title: 'Real-time alert',
          body: 'The popup shows you the red flags instantly, without leaving the page or copying anything.',
        },
      ],
      cta: 'Add to Chrome',
      note: 'Beta · via GitHub',
    },
    capas: {
      label: 'Under the hood',
      title: 'Six verification layers',
      subtitle: 'Every listing goes through six independent analyses. No signal goes unexplained.',
      features: [
        {
          title: 'Address verification',
          body: 'We verify with Google Maps that the address exists and that the coordinates match the stated location.',
        },
        {
          title: 'Price analysis',
          body: 'Compared with local market prices to detect suspiciously low prices designed to lure victims.',
        },
        {
          title: 'Fraud pattern detection',
          body: 'Compared against known fraud tactics, urgency pressure and common red flags.',
        },
        {
          title: 'Forensic image analysis',
          body: 'Reverse search and analysis to detect stolen, duplicate or AI-generated photos.',
        },
        {
          title: 'Neighbourhood analysis',
          body: 'Verified local context: nearby amenities, transport links and area reputation.',
        },
        {
          title: 'URL & host verification',
          body: 'Domain age, registration data and host profile verified to confirm authenticity.',
        },
      ],
    },
    form: {
      label: 'Try it now',
      title: 'Verify a listing',
      subtitle: 'Paste the text of a real listing or use our example to see a full report.',
      modeText: 'Paste text',
      modeUrl: 'Paste URL',
      placeholder: 'Paste the rental listing text here…\n\nTip: Ctrl+A to select all, Ctrl+C to copy, Ctrl+V to paste.',
      placeholderUrl: 'https://www.idealista.com/inmueble/12345678 or any listing URL',
      submit: 'Verify my listing',
      extracting: 'Extracting…',
      extractingUrl: 'Extracting data…',
      privacy: '',
      skip: 'or skip and fill the form manually',
      useExample: 'Use scam example',
    },
    stack: {
      label: 'Under the hood · engineering',
      title: 'Tech stack',
      award: 'Built for the Google Maps Platform Awards',
      subtitle:
        'Real location intelligence via Geocoding, Places and the Maps JavaScript API, analysis with Gemini, and parallel job queues with Redis + RQ.',
    },
    footer: {
      tagline: 'AI-powered rental fraud detection',
      portfolio: 'Portfolio project',
    },
  },
};
