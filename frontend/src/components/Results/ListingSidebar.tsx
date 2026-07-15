import React from 'react';
import { Analysis } from '../../types/index';
import MapComponent from '../UI/MapComponent/EnhancedMapComponent';

interface ListingSidebarProps {
  analysis: Analysis;
  neighborhoodData: Record<string, any> | undefined;
}

const ListingSidebar: React.FC<ListingSidebarProps> = ({ analysis, neighborhoodData }) => {
  const report = analysis.final_report && 'authenticity_score' in analysis.final_report
    ? analysis.final_report
    : null;

  // Imagen principal
  const firstImage = analysis.input_data.image_urls?.[0] ?? null;

  // Estado de reutilización de la primera imagen
  const reverseStep = analysis.analysis_steps?.find(s => s.job_name === 'reverse_image_search');
  const reverseResults: any[] = reverseStep?.result?.reverse_search_results ?? [];
  const firstImgResult = reverseResults[0] ?? null;
  const isReused = firstImgResult?.is_reused === true;
  const reusedCount = firstImgResult?.suspicious_urls?.length ?? 0;

  // Acciones
  const actions: string[] = report?.suggested_actions ?? [];

  // Nearby stats
  const nearby = [
    { label: 'Transporte',    count: neighborhoodData?.transit_stations?.count ?? 0 },
    { label: 'Restaurantes',  count: neighborhoodData?.restaurants?.count ?? 0 },
    { label: 'Supermercados', count: neighborhoodData?.supermarkets?.count ?? 0 },
    { label: 'Parques',       count: neighborhoodData?.parks?.count ?? 0 },
  ];
  const fmt = (n: number) => n >= 20 ? '20+' : String(n);

  // Sample reviews
  const reviewsStep = analysis.analysis_steps?.find(s => s.job_name === 'listing_reviews_analysis');
  const sampleReviews: any[] = (reviewsStep?.inputs_used?.reviews ?? []).slice(0, 3);

  // Descripción corta
  const shortDesc = analysis.input_data?.description?.slice(0, 150) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* A. Imagen card */}
      {firstImage && (
        <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ position: 'relative' }}>
            <img
              src={firstImage}
              alt="Imagen del anuncio"
              style={{ width: '100%', height: 190, objectFit: 'cover', display: 'block' }}
            />
            {isReused && (
              <div style={{
                position: 'absolute', top: 10, left: 10,
                background: 'rgba(0,0,0,0.75)',
                border: '1px solid rgba(242,184,75,0.4)',
                borderRadius: 7,
                padding: '5px 10px',
                fontFamily: "'IBM Plex Mono'",
                fontSize: 11.5,
                color: '#F2C877',
              }}>
                imagen reutilizada · {reusedCount} sitios
              </div>
            )}
          </div>
          {shortDesc && (
            <div style={{ padding: '14px 16px' }}>
              <p style={{ margin: 0, color: '#9AA3B2', fontSize: 13, lineHeight: 1.55 }}>
                {shortDesc}{analysis.input_data.description && analysis.input_data.description.length > 150 ? '…' : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* B. Acciones card */}
      {actions.length > 0 && (
        <div style={{
          border: '1px solid rgba(53,212,138,0.25)',
          background: 'rgba(53,212,138,0.05)',
          borderRadius: 16,
          padding: '20px',
        }}>
          <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 16, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 9, color: '#E7ECF3' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#35D48A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3 8-8" /><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
            </svg>
            Acciones recomendadas
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actions.map((action: string, index: number) => (
              <div key={index} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: 'rgba(53,212,138,0.14)', color: '#35D48A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono'", fontSize: 11, fontWeight: 600 }}>
                  {index + 1}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.55, color: '#C6CDD9' }}>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* C. Map + nearby */}
      <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ height: 240 }}>
          <MapComponent
            address={analysis.input_data.address}
            theme="dark"
            neighborhoodData={neighborhoodData}
            onLocationChange={() => {}}
            isDraggable={false}
          />
        </div>
        <div style={{ padding: '16px 18px' }}>
          {nearby.some(n => n.count > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 14 }}>
              {nearby.map((item, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 16, color: '#35D48A' }}>{fmt(item.count)}</span>
                  <span style={{ fontSize: 11.5, color: '#6B7385' }}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
          {analysis.input_data.address && (() => {
            const q = encodeURIComponent(analysis.input_data.address);
            return (
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`https://maps.google.com/maps?q=${q}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 12, color: '#AEB6C3', textDecoration: 'none', fontFamily: "'IBM Plex Mono'" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  Google Maps
                </a>
                <a
                  href={`https://maps.google.com/maps?layer=c&q=${q}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', fontSize: 12, color: '#AEB6C3', textDecoration: 'none', fontFamily: "'IBM Plex Mono'" }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
                  </svg>
                  Ver calle
                </a>
              </div>
            );
          })()}
        </div>
      </div>

      {/* D. Reviews card */}
      {sampleReviews.length > 0 && (
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, background: 'rgba(255,255,255,0.02)', padding: '20px' }}>
          <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 16, margin: '0 0 16px', color: '#E7ECF3' }}>
            Reseñas de huéspedes
          </h2>
          {sampleReviews.map((review: any, i: number) => (
            <div key={i} style={{ borderLeft: '2px solid rgba(53,212,138,0.3)', paddingLeft: 13, marginBottom: 14 }}>
              <p style={{ fontStyle: 'italic', color: '#C6CDD9', fontSize: 13, margin: '0 0 5px', lineHeight: 1.5 }}>
                "{review.review_text || review.text || review.comment || ''}"
              </p>
              {(review.reviewer_name || review.author || review.name) && (
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: '#6B7385' }}>
                  — {review.reviewer_name || review.author || review.name}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default ListingSidebar;
