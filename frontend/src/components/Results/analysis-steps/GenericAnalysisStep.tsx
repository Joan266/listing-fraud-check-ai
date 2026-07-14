import React from 'react';
import UrlCarousel from '../../UI/UrlCarousel';
import ImageCarousel from '../../UI/ImageCarousel';

interface GenericAnalysisStepProps {
  job_name: string;
  description: string;
  status: string;
  inputs_used: Record<string, any>;
  result: Record<string, any>;
  theme?: 'light' | 'dark';
}

const isUrl = (str: string): boolean => {
  try { new URL(str); return true; } catch { return false; }
};

const isImageUrl = (str: string): boolean => {
  if (!isUrl(str)) return false;
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(str)) return true;
  // CDN image handlers that pass the real image URL as a query param
  try {
    for (const val of new URL(str).searchParams.values()) {
      if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(val)) return true;
    }
  } catch { /* ignore */ }
  return false;
};

function extractUrls(obj: any): string[] {
  const urls: string[] = [];
  const traverse = (item: any) => {
    if (typeof item === 'string' && isUrl(item) && !isImageUrl(item)) urls.push(item);
    else if (Array.isArray(item)) item.forEach(traverse);
    else if (typeof item === 'object' && item !== null) Object.values(item).forEach(traverse);
  };
  traverse(obj);
  return [...new Set(urls)];
}

function extractImages(obj: any): string[] {
  const images: string[] = [];
  const traverse = (item: any) => {
    if (typeof item === 'string' && isImageUrl(item)) images.push(item);
    else if (Array.isArray(item)) item.forEach(traverse);
    else if (typeof item === 'object' && item !== null) Object.values(item).forEach(traverse);
  };
  traverse(obj);
  return [...new Set(images)];
}

/** Renders a result value in a readable way (avoids giant JSON blobs). */
function renderValue(value: any): React.ReactNode {
  if (value === null || value === undefined) return <span style={{ color: '#5E6675' }}>—</span>;
  if (typeof value === 'boolean') return (
    <span style={{ color: value ? '#35D48A' : '#F16A6A', fontWeight: 600 }}>{value ? 'Sí' : 'No'}</span>
  );
  if (typeof value === 'string') {
    // Long error strings — truncate with tooltip-like display
    if (value.length > 200) return (
      <span style={{ color: '#F2B84B', fontFamily: "'IBM Plex Mono'", fontSize: 11, lineHeight: 1.5 }}>
        {value.slice(0, 200)}…
      </span>
    );
    return <span style={{ color: '#C6CDD9' }}>{value}</span>;
  }
  if (typeof value === 'number') return <span style={{ color: '#35D48A', fontWeight: 600 }}>{value}</span>;
  if (Array.isArray(value)) {
    // Array of items that all have 'error' — show as error list
    if (value.length > 0 && value.every(item => item && typeof item === 'object' && 'error' in item)) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {value.map((item, i) => (
            <div key={i} style={{ padding: '8px 10px', background: 'rgba(241,106,106,0.06)', border: '1px solid rgba(241,106,106,0.2)', borderRadius: 8 }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: '#F16A6A', marginBottom: 3 }}>Error #{i + 1}</div>
              <div style={{ fontSize: 12, color: '#AEB6C3', lineHeight: 1.45 }}>
                {typeof item.error === 'string' ? item.error.split('\n')[0].slice(0, 120) : 'Error desconocido'}
              </div>
              {item.url && (
                <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#5E6675', marginTop: 4, wordBreak: 'break-all' }}>{item.url}</div>
              )}
            </div>
          ))}
        </div>
      );
    }
    if (value.length > 8) return <span style={{ color: '#9AA3B2' }}>{value.length} elementos</span>;
    return (
      <pre style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11.5, color: '#C6CDD9', whiteSpace: 'pre-wrap', margin: 0 }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length > 6) {
      const important = ['score', 'status', 'count', 'rating', 'found', 'result', 'error'];
      const filtered: Record<string, any> = {};
      important.forEach(k => { if (value[k] !== undefined) filtered[k] = value[k]; });
      return (
        <pre style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11.5, color: '#C6CDD9', whiteSpace: 'pre-wrap', margin: 0 }}>
          {JSON.stringify(Object.keys(filtered).length > 0 ? filtered : `{${keys.length} campos}`, null, 2)}
        </pre>
      );
    }
    return (
      <pre style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11.5, color: '#C6CDD9', whiteSpace: 'pre-wrap', margin: 0 }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span style={{ color: '#C6CDD9' }}>{String(value)}</span>;
}

const sectionCard: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.07)',
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "'Space Grotesk'",
  fontWeight: 600,
  fontSize: 13.5,
  color: '#E7ECF3',
  marginBottom: 12,
};

const rowLabel: React.CSSProperties = {
  fontSize: 12.5,
  color: '#6B7385',
  fontFamily: "'IBM Plex Mono'",
  textTransform: 'capitalize' as const,
  flexShrink: 0,
};

const GenericAnalysisStep: React.FC<GenericAnalysisStepProps> = ({
  job_name,
  description,
  status,
  inputs_used,
  result,
  theme = 'dark',
}) => {
  const urls = extractUrls({ ...inputs_used, ...result });
  const images = extractImages({ ...inputs_used, ...result });

  const urlPreviews = urls.map(url => ({
    url,
    title: `Analysis URL - ${job_name.replace(/_/g, ' ')}`,
    description: `URL analyzed during ${description.toLowerCase()}`,
  }));
  const imageItems = images.map(url => ({
    url,
    title: `Analysis Image - ${job_name.replace(/_/g, ' ')}`,
  }));

  // Top-level error on the result object
  const topLevelError = result?.error && typeof result.error === 'string' ? result.error : null;

  // Filter inputs: skip image URLs (shown in carousel) and large arrays
  const inputEntries = Object.entries(inputs_used || {}).filter(([, v]) => {
    if (typeof v === 'string' && isImageUrl(v)) return false;
    if (Array.isArray(v) && v.every(i => typeof i === 'string' && isImageUrl(i))) return false;
    return true;
  });

  const resultEntries = Object.entries(result || {}).filter(([k]) => k !== 'error' || !topLevelError);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ERROR banner */}
      {status === 'ERROR' && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(241,106,106,0.07)', border: '1px solid rgba(241,106,106,0.25)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F16A6A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>
          </svg>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#F16A6A', fontWeight: 500 }}>Verificación fallida</div>
            <div style={{ fontSize: 13, color: '#AEB6C3', marginTop: 4, lineHeight: 1.5 }}>
              {topLevelError || 'Este paso no se pudo completar. Puede deberse a un error de API o datos insuficientes.'}
            </div>
          </div>
        </div>
      )}

      {/* SKIPPED banner */}
      {status === 'SKIPPED' && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A8496" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/>
          </svg>
          <span style={{ fontSize: 13, color: '#7A8496' }}>Paso omitido — no había datos suficientes para ejecutar esta verificación.</span>
        </div>
      )}

      {/* Soft-failure warning */}
      {status === 'COMPLETED' && topLevelError && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(242,184,75,0.06)', border: '1px solid rgba(242,184,75,0.25)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2B84B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
            <path d="M12 9v4"/><path d="M12 17h.01"/>
          </svg>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#F2B84B', fontWeight: 500 }}>Resultado parcial</div>
            <div style={{ fontSize: 13, color: '#AEB6C3', marginTop: 4, lineHeight: 1.5 }}>{topLevelError}</div>
          </div>
        </div>
      )}

      {/* URL Carousel */}
      {urlPreviews.length > 0 && (
        <div>
          <div style={sectionLabel}>URLs analizadas</div>
          <UrlCarousel urls={urlPreviews} theme={theme} />
        </div>
      )}

      {/* Image Carousel */}
      {imageItems.length > 0 && (
        <div>
          <div style={sectionLabel}>Imágenes analizadas</div>
          <ImageCarousel images={imageItems} theme={theme} />
        </div>
      )}

      {/* Results */}
      {resultEntries.length > 0 && (
        <div style={sectionCard}>
          <div style={sectionLabel}>Resultados del análisis</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resultEntries.map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 9, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={rowLabel}>{key.replace(/_/g, ' ')}</span>
                <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inputs */}
      {inputEntries.length > 0 && (
        <div style={sectionCard}>
          <div style={sectionLabel}>Parámetros de entrada</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inputEntries.map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <span style={rowLabel}>{key.replace(/_/g, ' ')}:</span>
                <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default GenericAnalysisStep;
