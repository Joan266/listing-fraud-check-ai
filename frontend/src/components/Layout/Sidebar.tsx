import React from 'react';
import { History, Plus, ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import BrandLogo from '../UI/BrandLogo';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { toggleSidebar } from '../../store/appSlice';

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, sessionHistory, currentAnalysisId, isLoading } =
    useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });

  const scoreColor = (score: number): string => {
    if (score >= 70) return '#35D48A';
    if (score >= 50) return '#F2B84B';
    return '#F16A6A';
  };

  return (
    <div
      style={{
        width: sidebarCollapsed ? 80 : 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'relative',
        background: '#0B0F16',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        transition: 'width 0.3s',
      }}
    >
      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="hidden md:flex"
        style={{
          position: 'absolute',
          right: -12,
          top: 32,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#0C1017',
          border: '1px solid rgba(255,255,255,0.14)',
          color: '#9AA3B2',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          zIndex: 10,
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header */}
      <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: 10,
          }}
        >
          <BrandLogo size={36} />
          {!sidebarCollapsed && (
            <span
              style={{
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: '-0.02em',
                color: '#E7ECF3',
              }}
            >
              Alqui<span style={{ color: '#35D48A' }}>Seguro</span>
            </span>
          )}
        </div>
      </div>

      {/* New analysis button */}
      <div style={{ padding: 12 }}>
        <button
          onClick={() => navigate('/')}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: sidebarCollapsed ? '10px 6px' : '10px 14px',
            background: '#35D48A',
            color: '#08130D',
            fontWeight: 600,
            fontSize: 14,
            borderRadius: 10,
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: isLoading ? 0.5 : 1,
            transition: 'background 0.15s, opacity 0.15s',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = '#5FE0A5';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#35D48A';
          }}
        >
          <Plus size={17} />
          {!sidebarCollapsed && <span>Nuevo análisis</span>}
        </button>
      </div>

      {/* History list */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!sidebarCollapsed && (
          <div
            style={{
              padding: '12px 16px 8px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <h2
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10.5,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#5E6675',
                margin: 0,
              }}
            >
              <History size={12} />
              Análisis recientes
            </h2>
          </div>
        )}

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {sessionHistory.map((analysis) => {
            const isRunning =
              analysis.status === 'PENDING' || analysis.status === 'IN_PROGRESS';
            const isFailed = analysis.status === 'FAILED';
            const isCurrent = currentAnalysisId === analysis.id;
            const hasScore =
              analysis.final_report && 'authenticity_score' in analysis.final_report;

            return (
              <Link
                key={analysis.id}
                to={`/results/${analysis.id}`}
                style={{
                  display: 'block',
                  padding: sidebarCollapsed ? '10px 6px' : '10px 12px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  border: `1px solid ${isCurrent ? 'rgba(53,212,138,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  background: isCurrent
                    ? 'rgba(53,212,138,0.07)'
                    : 'rgba(255,255,255,0.02)',
                  opacity: isFailed ? 0.45 : 1,
                  pointerEvents: isFailed ? 'none' : 'auto',
                  color: '#E7ECF3',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent && !isFailed)
                    (e.currentTarget as HTMLAnchorElement).style.background =
                      'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = isCurrent
                    ? 'rgba(53,212,138,0.07)'
                    : 'rgba(255,255,255,0.02)';
                }}
              >
                {!sidebarCollapsed ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 11, color: '#5E6675' }}>
                        {formatDate(analysis.created_at)}
                      </span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {hasScore && analysis.final_report && (
                          <>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: scoreColor(
                                  (analysis.final_report as { authenticity_score: number })
                                    .authenticity_score
                                ),
                              }}
                            >
                              A:
                              {
                                (analysis.final_report as { authenticity_score: number })
                                  .authenticity_score
                              }
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: scoreColor(
                                  (analysis.final_report as { quality_score: number })
                                    .quality_score
                                ),
                              }}
                            >
                              Q:
                              {
                                (analysis.final_report as { quality_score: number })
                                  .quality_score
                              }
                            </span>
                          </>
                        )}
                        {isRunning && (
                          <span
                            style={{
                              fontSize: 11,
                              color: '#35D48A',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Loader2 size={11} className="animate-spin" />
                            En curso
                          </span>
                        )}
                        {isFailed && (
                          <span
                            style={{
                              fontSize: 11,
                              color: '#F16A6A',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <AlertTriangle size={11} />
                            Fallido
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#D4DAE4',
                      }}
                    >
                      {analysis.input_data.address || 'Dirección desconocida'}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: '#5E6675',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginTop: 2,
                      }}
                    >
                      {analysis.input_data.property_type || 'Propiedad'}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {hasScore && analysis.final_report ? (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: scoreColor(
                            (analysis.final_report as { authenticity_score: number })
                              .authenticity_score
                          ),
                        }}
                      >
                        {
                          (analysis.final_report as { authenticity_score: number })
                            .authenticity_score
                        }
                      </span>
                    ) : (
                      <History size={16} color="#5E6675" />
                    )}
                  </div>
                )}
              </Link>
            );
          })}

          {sessionHistory.length === 0 && !sidebarCollapsed && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#5E6675' }}>
              <History size={26} style={{ margin: '0 auto 8px', opacity: 0.35, display: 'block' }} />
              <p style={{ fontSize: 12.5, margin: 0 }}>Sin análisis aún</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
