import React from 'react';

interface Flag {
  category: 'High' | 'Medium' | 'Positive' | string;
  description: string;
}

interface FlagsCardProps {
  flags: Flag[];
}

const FLAG_STYLES: Record<string, { color: string; bg: string; border: string; glyph: string }> = {
  High:     { color: '#F16A6A', bg: 'rgba(241,106,106,0.08)', border: 'rgba(241,106,106,0.25)', glyph: '✕' },
  Medium:   { color: '#F2B84B', bg: 'rgba(242,184,75,0.08)',  border: 'rgba(242,184,75,0.25)',  glyph: '⚠' },
  Positive: { color: '#35D48A', bg: 'rgba(53,212,138,0.08)',  border: 'rgba(53,212,138,0.25)',  glyph: '✓' },
};

const DEFAULT_STYLE = { color: '#7A8496', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', glyph: '–' };

const CATEGORY_LABELS: Record<string, string> = {
  High: 'ALTA',
  Medium: 'MEDIA',
  Positive: 'POSITIVA',
};

export const FlagsCard: React.FC<FlagsCardProps> = ({ flags }) => {
  if (!flags || flags.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '24px',
    }}>
      <h2 style={{
        color: '#E7ECF3',
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 18,
        fontWeight: 600,
        margin: '0 0 4px 0',
      }}>
        Señales detectadas
      </h2>
      <p style={{ color: '#8A93A3', fontSize: 13, margin: '0 0 16px' }}>
        Cada hallazgo, clasificado por su impacto en el riesgo.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {flags.map((flag, index) => {
          const s = FLAG_STYLES[flag.category] ?? DEFAULT_STYLE;
          const tagLabel = CATEGORY_LABELS[flag.category] ?? flag.category.toUpperCase();
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: 13,
                padding: '13px 15px',
                borderRadius: 12,
                background: s.bg,
                border: `1px solid ${s.border}`,
                alignItems: 'center',
              }}
            >
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 13,
                color: s.color,
                flexShrink: 0,
              }}>{s.glyph}</span>
              <span style={{ flex: 1, fontSize: 14, color: '#C6CDD9', lineHeight: 1.5 }}>
                {flag.description}
              </span>
              <span style={{
                fontFamily: "'IBM Plex Mono'",
                fontSize: 10.5,
                color: s.color,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                {tagLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
