import React, { useMemo, useState } from 'react';
import UrlForensicsStep from './analysis-steps/UrlForensicStep';
import PriceAnalysisStep from './analysis-steps/PriceAnalysisSteps';
import ReviewsAnalysisStep from './analysis-steps/ReviewsAnalysisStep';
import GenericAnalysisStep from './analysis-steps/GenericAnalysisStep';

interface AnalysisStep {
  job_name: string;
  description: string;
  status: string;
  inputs_used: Record<string, any>;
  result: Record<string, any>;
  risk_score?: number;
  confidence?: number;
}

const getRiskColor = (score: number) =>
  score >= 61 ? '#F16A6A' : score >= 31 ? '#F2B84B' : '#35D48A';

const JOB_LABELS: Record<string, string> = {
  geocode: 'Verificación de dirección',
  reputation_check: 'Reputación del anfitrión',
  description_plagiarism_check: 'Plagio de la descripción',
  description_analysis: 'Análisis de la descripción',
  communication_analysis: 'Análisis de comunicación',
  listing_reviews_analysis: 'Análisis de reseñas',
  reverse_image_search: 'Búsqueda inversa de imágenes',
  price_sanity_check: 'Coherencia de precio',
  host_profile_check: 'Perfil del anfitrión',
  url_forensics: 'Análisis forense de URL',
  iban_country_check: 'Verificación de IBAN',
  address_cross_platform_search: 'Búsqueda en otras plataformas',
};

/**
 * Detects "soft failures": steps marked COMPLETED where all results
 * actually contain errors (e.g. Gemini API failures per image).
 */
function isSoftFailure(step: AnalysisStep): boolean {
  if (step.status !== 'COMPLETED') return false;
  const result = step.result;
  if (!result) return false;
  // Top-level error field
  if (result.error && typeof result.error === 'string') return true;
  // Array where every item has an 'error' key
  for (const val of Object.values(result)) {
    if (
      Array.isArray(val) &&
      val.length > 0 &&
      val.every((item: any) => item && typeof item === 'object' && 'error' in item)
    ) return true;
  }
  return false;
}

function getStepStyle(step: AnalysisStep) {
  if (step.status === 'ERROR') return {
    badgeBg: 'rgba(241,106,106,0.14)',
    color: '#F16A6A',
    ring: 'rgba(241,106,106,0.35)',
    cardBorder: 'rgba(241,106,106,0.22)',
    label: 'ERROR',
    glyph: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F16A6A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    ),
  };
  if (isSoftFailure(step)) return {
    badgeBg: 'rgba(242,184,75,0.14)',
    color: '#F2B84B',
    ring: 'rgba(242,184,75,0.35)',
    cardBorder: 'rgba(242,184,75,0.22)',
    label: 'PARCIAL',
    glyph: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F2B84B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
        <path d="M12 9v4"/><path d="M12 17h.01"/>
      </svg>
    ),
  };
  if (step.status === 'SKIPPED') return {
    badgeBg: 'rgba(255,255,255,0.06)',
    color: '#7A8496',
    ring: 'rgba(122,132,150,0.3)',
    cardBorder: 'rgba(255,255,255,0.04)',
    label: 'OMITIDO',
    glyph: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A8496" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14"/>
      </svg>
    ),
  };
  // COMPLETED
  return {
    badgeBg: 'rgba(53,212,138,0.12)',
    color: '#35D48A',
    ring: 'rgba(53,212,138,0.35)',
    cardBorder: 'rgba(255,255,255,0.06)',
    label: 'OK',
    glyph: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#35D48A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    ),
  };
}

interface AnalysisRunbookProps {
  steps: AnalysisStep[];
  theme?: 'light' | 'dark';
}

export const AnalysisRunbook: React.FC<AnalysisRunbookProps> = ({ steps, theme = 'dark' }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const sortedSteps = useMemo(() => {
    const order = (s: AnalysisStep): number => {
      if (s.status === 'ERROR') return 0;
      if (isSoftFailure(s)) return 1;
      if (s.status === 'COMPLETED') return 2;
      return 3; // SKIPPED
    };
    return [...steps].sort((a, b) => order(a) - order(b));
  }, [steps]);

  const toggleStep = (index: number) => {
    const next = new Set(expandedSteps);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedSteps(next);
  };

  const renderContent = (step: AnalysisStep) => {
    const props = { inputs_used: step.inputs_used, result: step.result, theme };
    switch (step.job_name) {
      case 'url_forensics': return <UrlForensicsStep {...props} />;
      case 'price_sanity_check': return <PriceAnalysisStep {...props} />;
      case 'listing_reviews_analysis': return <ReviewsAnalysisStep {...props} />;
      default: return (
        <GenericAnalysisStep
          job_name={step.job_name}
          description={step.description}
          status={step.status}
          {...props}
        />
      );
    }
  };

  const completedCount = steps.filter(s => s.status === 'COMPLETED').length;
  const errorCount = steps.filter(s => s.status === 'ERROR' || isSoftFailure(s)).length;

  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, background: 'rgba(255,255,255,0.02)', padding: '28px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 19, margin: 0, letterSpacing: '-0.01em' }}>
            Desglose de verificaciones
          </h2>
          <p style={{ color: '#8A93A3', fontSize: 13.5, margin: '4px 0 0' }}>
            {completedCount} completados
            {errorCount > 0 && (
              <span style={{ color: '#F2B84B', marginLeft: 8 }}>· {errorCount} con errores</span>
            )}
          </p>
        </div>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#6B7385' }}>{steps.length} trabajos</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {sortedSteps.map((step, index) => {
          const isExpanded = expandedSteps.has(index);
          const { badgeBg, color, ring, cardBorder, label, glyph } = getStepStyle(step);
          const soft = isSoftFailure(step);

          return (
            <div
              key={index}
              style={{
                border: `1px solid ${cardBorder}`,
                borderRadius: 13,
                background: 'rgba(255,255,255,0.015)',
                transition: 'border-color 0.2s',
              }}
            >
              <button
                onClick={() => toggleStep(index)}
                style={{ width: '100%', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'block' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: badgeBg }}>
                    {glyph}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: '#E7ECF3' }}>
                      {JOB_LABELS[step.job_name] || step.job_name}
                    </div>
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, fontWeight: 500, color, border: `1px solid ${ring}`, borderRadius: 99, padding: '3px 10px', whiteSpace: 'nowrap', marginRight: 8 }}>
                    {label}
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7385" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>

                <p style={{ color: '#8A93A3', fontSize: 13.5, lineHeight: 1.55, margin: '11px 0 0', paddingLeft: 42 }}>
                  {step.description}
                  {soft && (
                    <span style={{ color: '#F2B84B', fontFamily: "'IBM Plex Mono'", fontSize: 11, marginLeft: 10 }}>
                      · subanálisis fallido
                    </span>
                  )}
                  {step.status === 'SKIPPED' && (
                    <span style={{ color: '#5E6675', fontFamily: "'IBM Plex Mono'", fontSize: 11, marginLeft: 10 }}>
                      · omitido por falta de datos
                    </span>
                  )}
                </p>

                {step.status === 'COMPLETED' && !soft && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, paddingLeft: 42 }}>
                    <div style={{ flex: 1, maxWidth: 220 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono'", fontSize: 10.5, color: '#6B7385', marginBottom: 4 }}>
                        <span>Riesgo</span><span>{step.risk_score ?? 0}/100</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${step.risk_score ?? 0}%`, borderRadius: 99, background: getRiskColor(step.risk_score ?? 0) }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, color: '#5E6675', whiteSpace: 'nowrap' }}>
                      confianza {(step.confidence ?? 0).toFixed(1)}
                    </span>
                  </div>
                )}
              </button>

              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 18px' }}>
                  {renderContent(step)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
