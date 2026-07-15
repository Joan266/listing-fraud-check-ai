import React from 'react';

interface ReverseImageResult {
  url: string;
  is_reused: boolean;
  reason: string;
  suspicious_urls: string[];
}

interface ReverseImageSearchStepProps {
  inputs_used: Record<string, any>;
  result: Record<string, any>;
  theme?: 'light' | 'dark';
}

const getHostname = (url: string): string => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
};

const ReverseImageSearchStep: React.FC<ReverseImageSearchStepProps> = ({ result }) => {
  const searchResults: ReverseImageResult[] = result?.reverse_search_results ?? [];

  if (searchResults.length === 0) {
    return (
      <span style={{ color: '#5E6675', fontSize: 13 }}>
        No se encontraron resultados de búsqueda inversa.
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {searchResults.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 14,
            padding: '14px 16px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid ${item.is_reused ? 'rgba(242,184,75,0.22)' : 'rgba(53,212,138,0.22)'}`,
            alignItems: 'flex-start',
          }}
        >
          {/* Thumbnail */}
          <img
            src={item.url}
            alt={`Imagen ${i + 1}`}
            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Verdict badge */}
            <span style={{
              display: 'inline-block',
              marginBottom: 9,
              fontFamily: "'IBM Plex Mono'",
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 99,
              background: item.is_reused ? 'rgba(242,184,75,0.14)' : 'rgba(53,212,138,0.12)',
              color: item.is_reused ? '#F2B84B' : '#35D48A',
              border: `1px solid ${item.is_reused ? 'rgba(242,184,75,0.35)' : 'rgba(53,212,138,0.35)'}`,
            }}>
              {item.is_reused ? 'Reutilizada' : 'Original'}
            </span>

            {/* Reason */}
            {item.reason && (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#AEB6C3', lineHeight: 1.55 }}>
                {item.reason}
              </p>
            )}

            {/* Domain chips */}
            {item.suspicious_urls?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {item.suspicious_urls.map((url, j) => (
                  <a
                    key={j}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '3px 9px',
                      borderRadius: 6,
                      background: 'rgba(242,184,75,0.08)',
                      border: '1px solid rgba(242,184,75,0.22)',
                      fontSize: 12,
                      color: '#F2B84B',
                      textDecoration: 'none',
                      fontFamily: "'IBM Plex Mono'",
                    }}
                  >
                    {getHostname(url)}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReverseImageSearchStep;
