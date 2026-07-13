import React, { useState, useEffect, useRef } from 'react';
import BrandLogo from './BrandLogo';
import { useAppSelector } from '../../hooks/redux';
import { useNavigate } from 'react-router-dom';

interface StepProgress {
  job_name: string;
  status: string;
  description?: string;
}

interface LogLine {
  time: string;
  text: string;
  color: string;
}

const JOB_LABELS: Record<string, string> = {
  geocode: 'Verificación de dirección',
  place_details: 'Detalles del lugar (Places)',
  neighborhood_analysis: 'Análisis del barrio',
  reputation_check: 'Reputación del anfitrión',
  description_plagiarism_check: 'Plagio de la descripción',
  description_analysis: 'Análisis de la descripción',
  communication_analysis: 'Análisis de comunicación',
  listing_reviews_analysis: 'Análisis de reseñas',
  reverse_image_search: 'Búsqueda inversa de imágenes',
  ai_image_detection: 'Detección de imágenes IA',
  price_sanity_check: 'Coherencia de precio',
  host_profile_check: 'Perfil del anfitrión',
  online_presence_analysis: 'Presencia online',
  url_forensics: 'Análisis forense de URL',
  land_registry_check: 'Registro de la propiedad',
};

const ALL_JOBS = Object.keys(JOB_LABELS);

interface AnalysisProgressProps {
  checkId: string;
  sessionId: string;
}

function clock(): string {
  return new Date().toTimeString().slice(0, 8);
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ checkId, sessionId }) => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.app);
  const [completedSteps, setCompletedSteps] = useState<StepProgress[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const pushLog = (text: string, color: string) => {
    setLog(prev => [...prev, { time: clock(), text, color }]);
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  };

  useEffect(() => {
    pushLog('› conexión SSE abierta — analysis_id ' + checkId, '#6B7385');

    const eventSource = new EventSource(
      `${baseURL}/api/v1/analysis/${checkId}/stream?session_id=${sessionId}`,
    );

    eventSource.addEventListener('step_complete', (event) => {
      const data: StepProgress = JSON.parse(event.data);
      setCompletedSteps((prev) => {
        if (prev.some((s) => s.job_name === data.job_name)) return prev;
        return [...prev, data];
      });
      const label = JOB_LABELS[data.job_name] || data.job_name;
      if (data.status === 'ERROR') {
        pushLog('✗ ' + label + ' — error', '#F16A6A');
      } else if (data.status === 'SKIPPED') {
        pushLog('⤼ ' + label + ' — omitido', '#7A8496');
      } else {
        pushLog('✓ ' + label + ' — completado', '#35D48A');
      }
    });

    eventSource.addEventListener('done', () => {
      pushLog('✓ ' + ALL_JOBS.length + '/' + ALL_JOBS.length + ' verificaciones completadas', '#35D48A');
      pushLog('⟳ agregando señales y puntuando…', '#F2B84B');
      setTimeout(() => {
        pushLog('✓ informe generado', '#35D48A');
        setIsDone(true);
      }, 800);
      eventSource.close();
    });

    eventSource.addEventListener('error', () => {
      pushLog('✗ error de conexión SSE', '#F16A6A');
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [checkId, sessionId, baseURL]);

  const progress = Math.round((completedSteps.length / ALL_JOBS.length) * 100);

  const sortedJobs = [...ALL_JOBS].sort((a, b) => {
    const stepA = completedSteps.find((s) => s.job_name === a);
    const stepB = completedSteps.find((s) => s.job_name === b);
    const rank = (step: StepProgress | undefined): number => {
      if (!step) return 2;
      if (step.status === 'ERROR') return 0;
      if (step.status === 'SKIPPED') return 3;
      return 1;
    };
    return rank(stepA) - rank(stepB);
  });

  const activeJobIndex = completedSteps.length < ALL_JOBS.length ? completedSteps.length : -1;
  const activeJob = activeJobIndex >= 0 ? sortedJobs[activeJobIndex] : null;

  const phaseTag = isDone ? 'Completado' : 'Analizando en directo';
  const headline = isDone ? 'Análisis completado' : 'Verificando el anuncio…';
  const sub = isDone
    ? 'todas las capas procesadas.'
    : 'las verificaciones llegan en streaming según se completan.';

  const pctNum = isDone ? 100 : progress;
  const doneCount = isDone ? ALL_JOBS.length : completedSteps.length;

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-160px', left: '50%', width: '1000px', height: '600px',
        transform: 'translateX(-50%)', pointerEvents: 'none',
        background: 'radial-gradient(closest-side, rgba(53,212,138,0.12), transparent 70%)',
        animation: 'asDrift 16s ease-in-out infinite',
      }} />

      <div style={{ position: 'relative', maxWidth: '1060px', margin: '0 auto', padding: '0 28px' }}>

        {/* Nav */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <BrandLogo size={32} />
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>
              Alqui<span style={{ color: '#35D48A' }}>Seguro</span>
            </span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#6B7385' }}>
            análisis #{checkId.slice(0, 8)}
          </span>
        </header>

        {/* Headline + progress */}
        <div style={{ textAlign: 'center', padding: '48px 0 34px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '6px 14px', border: '1px solid rgba(53,212,138,0.28)', borderRadius: 999,
            background: 'rgba(53,212,138,0.06)', fontFamily: "'IBM Plex Mono'", fontSize: 12.5,
            color: '#8FE7BD', marginBottom: 22,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#35D48A',
              boxShadow: '0 0 0 3px rgba(53,212,138,0.25)',
              animation: isDone ? 'none' : 'asPulse 1.6s ease-in-out infinite',
              display: 'inline-block',
            }} />
            {phaseTag}
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk'", fontWeight: 700,
            fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-0.03em',
            margin: 0, lineHeight: 1.08,
          }}>
            {headline}
          </h1>
          <p style={{ color: '#9AA3B2', fontSize: 16.5, margin: '14px auto 0', maxWidth: '52ch' }}>{sub}</p>

          {/* Progress bar */}
          <div style={{ maxWidth: 560, margin: '30px auto 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#6B7385', marginBottom: 8 }}>
              <span>{doneCount} / {ALL_JOBS.length} verificaciones</span>
              <span>{pctNum}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: pctNum + '%', borderRadius: 99, background: 'linear-gradient(90deg,#1F9E68,#35D48A)', transition: 'width 0.45s cubic-bezier(0.3,0.8,0.3,1)' }} />
            </div>
          </div>
        </div>

        {/* 2-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingBottom: 40 }}>

          {/* Checklist */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, background: 'rgba(255,255,255,0.02)', padding: '22px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 16, margin: 0 }}>Verificaciones</h2>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11.5, color: '#6B7385' }}>{ALL_JOBS.length} trabajos</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedJobs.map((jobName, idx) => {
                const step = completedSteps.find((s) => s.job_name === jobName);
                const isError = step?.status === 'ERROR';
                const isSkipped = step?.status === 'SKIPPED';
                const isDoneStep = !!step && !isError && !isSkipped;
                const isRunning = !step && jobName === activeJob;

                let border = 'rgba(255,255,255,0.05)';
                let bg = 'rgba(255,255,255,0.01)';
                let textColor = '#6B7385';
                let tagColor = '#5E6675';
                let tag = 'en cola';

                if (isError) { border = 'rgba(241,106,106,0.28)'; bg = 'rgba(241,106,106,0.05)'; textColor = '#E7ECF3'; tagColor = '#F16A6A'; tag = 'ERROR'; }
                else if (isSkipped) { border = 'rgba(255,255,255,0.06)'; bg = 'rgba(255,255,255,0.015)'; textColor = '#E7ECF3'; tagColor = '#7A8496'; tag = 'OMITIDO'; }
                else if (isDoneStep) { border = 'rgba(255,255,255,0.06)'; bg = 'rgba(255,255,255,0.015)'; textColor = '#E7ECF3'; tagColor = '#35D48A'; tag = 'OK'; }
                else if (isRunning) { border = 'rgba(53,212,138,0.28)'; bg = 'rgba(53,212,138,0.05)'; textColor = '#C6CDD9'; tagColor = '#8FE7BD'; tag = 'ejecutando'; }

                return (
                  <div key={jobName} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    border: '1px solid ' + border, borderRadius: 12, background: bg, transition: 'all 0.3s',
                  }}>
                    <div style={{ width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isError ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F16A6A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                        </svg>
                      ) : isSkipped ? (
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7A8496" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                        </svg>
                      ) : isDoneStep ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#35D48A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : isRunning ? (
                        <div style={{ width: 16, height: 16, border: '2.5px solid rgba(53,212,138,0.25)', borderTopColor: '#35D48A', borderRadius: '50%', animation: 'asSpin 0.7s linear infinite' }} />
                      ) : (
                        <div style={{ width: 9, height: 9, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.18)' }} />
                      )}
                    </div>
                    <span style={{ flex: 1, fontSize: 13.5, color: textColor }}>{JOB_LABELS[jobName] || jobName}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, letterSpacing: '0.04em', color: tagColor }}>{tag}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal */}
          <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, background: '#070A10', overflow: 'hidden', height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F16A6A', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F2B84B', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#35D48A', display: 'inline-block' }} />
              <span style={{ marginLeft: 8, fontFamily: "'IBM Plex Mono'", fontSize: 11.5, color: '#5E6675' }}>stream · SSE</span>
            </div>
            <div ref={logRef} style={{ padding: '16px 18px', height: 430, overflowY: 'auto', fontFamily: "'IBM Plex Mono'", fontSize: 12.5, lineHeight: 1.75 }}>
              {log.map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, animation: 'anRow 0.25s ease both' }}>
                  <span style={{ color: '#3A4453', flexShrink: 0 }}>{line.time}</span>
                  <span style={{ color: line.color }}>{line.text}</span>
                </div>
              ))}
              {!isDone && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#3A4453' }}>{clock()}</span>
                  <span style={{ color: '#35D48A' }}>▸ <span style={{ display: 'inline-block', width: 8, background: '#35D48A', animation: 'asPulse 1s step-end infinite' }}>&nbsp;</span></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ready state */}
        {isDone && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0 60px' }}>
            <div style={{
              width: '100%', maxWidth: 560, textAlign: 'center',
              border: '1px solid rgba(53,212,138,0.3)', borderRadius: 20,
              background: 'rgba(53,212,138,0.06)', padding: '34px 32px',
              animation: 'asRise 0.4s ease both',
            }}>
              <div style={{ width: 60, height: 60, margin: '0 auto 16px', borderRadius: '50%', background: 'rgba(53,212,138,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#35D48A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 24, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Informe listo
              </h2>
              <p style={{ color: '#AEB6C3', fontSize: 15, margin: '0 0 22px' }}>
                {completedSteps.length} verificaciones procesadas.
              </p>
              <button
                onClick={() => navigate(`/results/${checkId}`)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: '#35D48A', color: '#08130D', fontWeight: 600, fontSize: 16,
                  padding: '14px 26px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  boxShadow: '0 12px 30px rgba(53,212,138,0.3)',
                }}
              >
                Ver informe completo
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
