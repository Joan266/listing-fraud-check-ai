import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setCurrentAnalysisId, setError } from '../store/appSlice';
import { apiClient } from '../api/client';
import {
  Link as LinkIcon, Type,
  MapPin, BarChart3, AlertTriangle, Scan, Building2, Globe,
  ExternalLink, Cpu, FileCheck, Download, Zap,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LoadingScreen } from '../components/UI/LoadingScreen';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import BrandLogo from '../components/UI/BrandLogo';
import { translations, type Lang } from '../i18n/landing';

// ── Icon sets ────────────────────────────────────────────────────────────────
const STEP_ICONS    = [ExternalLink, Cpu, FileCheck];
const FEATURE_ICONS = [MapPin, BarChart3, AlertTriangle, Scan, Building2, Globe];
const EXT_ICONS     = [Download, Cpu, Zap];

// ── Tech stack ───────────────────────────────────────────────────────────────
const STACK: Array<{ name: string; role: Record<string, string>; icon: string }> = [
  { name: 'React',        role: { es: 'UI',                 en: 'UI'                  }, icon: 'https://cdn.simpleicons.org/react/61DAFB'       },
  { name: 'Redux',        role: { es: 'Estado',             en: 'State'               }, icon: 'https://cdn.simpleicons.org/redux/764ABC'       },
  { name: 'Tailwind CSS', role: { es: 'Estilos',            en: 'Styling'             }, icon: 'https://cdn.simpleicons.org/tailwindcss/06B6D4' },
  { name: 'FastAPI',      role: { es: 'API · Python',       en: 'API · Python'        }, icon: 'https://cdn.simpleicons.org/fastapi/009688'     },
  { name: 'PostgreSQL',   role: { es: 'Base de datos',      en: 'Database'            }, icon: 'https://cdn.simpleicons.org/postgresql/4169E1'  },
  { name: 'Redis + RQ',   role: { es: 'Colas de trabajos',  en: 'Job queues'          }, icon: 'https://cdn.simpleicons.org/redis/FF4438'       },
  { name: 'Gemini',       role: { es: 'IA generativa',      en: 'Generative AI'       }, icon: 'https://cdn.simpleicons.org/googlegemini/8E75FF'},
  { name: 'Google Maps',  role: { es: 'Geocoding · Places', en: 'Geocoding · Places'  }, icon: 'https://cdn.simpleicons.org/googlemaps/4285F4'  },
  { name: 'Cloud Run',    role: { es: 'Despliegue API',     en: 'API deploy'          }, icon: 'https://cdn.simpleicons.org/googlecloud/4285F4' },
  { name: 'Docker',       role: { es: 'Contenedores',       en: 'Containers'          }, icon: 'https://cdn.simpleicons.org/docker/2496ED'      },
  { name: 'Firebase',     role: { es: 'Hosting frontend',   en: 'Frontend hosting'    }, icon: 'https://cdn.simpleicons.org/firebase/DD2C00'    },
  { name: 'Python',       role: { es: 'Backend · workers',  en: 'Backend · workers'   }, icon: 'https://cdn.simpleicons.org/python/3776AB'      },
];

// ── Scam example listing ─────────────────────────────────────────────────────
const SCAM_EXAMPLE = `Alquiler piso céntrico Madrid · 3 hab · 620 €/mes

Bonito piso de 3 habitaciones en pleno centro de Madrid, totalmente reformado y listo para entrar. Muy luminoso, tranquilo, cocina equipada y salón amplio. Disponible de inmediato.

Soy el propietario y actualmente estoy trabajando en el extranjero, por lo que no puedo enseñar el piso en persona. Una vez formalizada la reserva, envío las llaves por mensajería certificada. Solo necesito 1 mes de fianza (620 €) mediante transferencia bancaria para bloquear el piso a tu nombre. El precio es especialmente bajo porque necesito tenerlo alquilado antes de mi vuelta, prevista para dentro de 2 semanas.

No atiendo llamadas, solo correo electrónico. Respondo en menos de 24 horas. No pierdas la oportunidad, hay mucho interés y ya hay varias personas interesadas.

Ubicación: Calle Gran Vía, 45, Madrid
Superficie: 85 m²
Planta: 4.ª con ascensor
Calefacción: individual gas`;

// ── Shared inline SVGs ───────────────────────────────────────────────────────
const ChromeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    <path d="M21.2 8H12" /><path d="m3.9 6.8 4.6 8" /><path d="m14.6 21.4 4.6-8" />
  </svg>
);

const CheckMark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#35D48A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const navigate   = useNavigate();
  const dispatch   = useAppDispatch();
  const { isLoading: isGlobalLoading, sessionId } = useAppSelector((s) => s.app);
  const formRef    = useRef<HTMLElement>(null);

  const [lang, setLang]           = useState<Lang>('es');
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text');
  const [isExtracting, setIsExtracting] = useState(false);
  const [listingText, setListingText]   = useState('');
  const [listingUrl, setListingUrl]     = useState('');

  const t = translations[lang];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from_extension') !== 'true') return;
    const stored = localStorage.getItem('fraudcheck_extension_data');
    localStorage.removeItem('fraudcheck_extension_data');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const data = parsed?.extracted_data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          window.history.replaceState({}, '', '/');
          toast.success('Datos recibidos de la extensión de Chrome');
          navigate('/review', { state: { extractedData: data } });
          return;
        }
      } catch { /* discard malformed data */ }
    }
  }, []);

  useEffect(() => { dispatch(setCurrentAnalysisId(null)); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExtracting(true);
    dispatch(setError(null));
    try {
      if (inputMode === 'url') {
        const url = listingUrl.trim();
        if (!url) { toast('Introduce la URL de un anuncio.'); setIsExtracting(false); return; }
        const result = await apiClient.extractFromUrl(sessionId, url);
        navigate('/review', { state: { extractedData: result.extracted_data } });
      } else {
        const text = listingText.trim().replace(/\s+/g, ' ');
        if (text.length < 100) { toast('El anuncio debe tener al menos 100 caracteres.'); setIsExtracting(false); return; }
        const extractedData = await apiClient.extractData(sessionId, text);
        navigate('/review', { state: { extractedData } });
      }
    } catch (err) {
      dispatch(setError(err instanceof Error ? err.message : 'Error al procesar el anuncio.'));
    } finally {
      setIsExtracting(false);
    }
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth' });

  if (isGlobalLoading) return <LoadingScreen />;

  // ── Shared style helpers ──────────────────────────────────────────────────
  const S = {
    monoLabel: {
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 12.5,
      letterSpacing: '0.14em',
      color: '#35D48A',
      textTransform: 'uppercase' as const,
    },
    sectionTitle: {
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      fontWeight: 700,
      fontSize: 'clamp(30px,4vw,44px)' as string,
      letterSpacing: '-0.03em',
      margin: '14px 0 0',
      color: '#E7ECF3',
    },
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '-160px', left: '50%', width: '1100px', height: '640px',
        transform: 'translateX(-50%)', pointerEvents: 'none',
        background: 'radial-gradient(closest-side, rgba(53,212,138,0.11), transparent 70%)',
        animation: 'asDrift 16s ease-in-out infinite',
      }} />

      <div style={{ position: 'relative', maxWidth: '1180px', margin: '0 auto', padding: '0 28px' }}>

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandLogo size={34} />
            <span style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>
              Alqui<span style={{ color: '#35D48A' }}>Seguro</span>
            </span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#como"      style={{ color: '#9AA3B2', fontSize: 14, textDecoration: 'none' }}>{t.nav.comoFunciona}</a>
            <a href="#extension" style={{ color: '#9AA3B2', fontSize: 14, textDecoration: 'none' }}>{t.nav.extension}</a>
            <a href="#capas"     style={{ color: '#9AA3B2', fontSize: 14, textDecoration: 'none' }}>{t.nav.verificaciones}</a>
            <a href="#stack"     style={{ color: '#9AA3B2', fontSize: 14, textDecoration: 'none' }}>{t.nav.stack}</a>

            {/* ES / EN toggle */}
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, overflow: 'hidden' }}>
              {(['es', 'en'] as Lang[]).map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: '5px 11px', border: 'none', cursor: 'pointer',
                  background: lang === l ? 'rgba(53,212,138,0.14)' : 'transparent',
                  color: lang === l ? '#35D48A' : '#6B7385',
                  fontSize: 12, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.07em',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  {l}
                </button>
              ))}
            </div>

            <button onClick={scrollToForm} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: '#35D48A', color: '#08130D', fontWeight: 600, fontSize: 13.5,
              padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
            }}>
              {t.nav.cta}
            </button>
          </nav>
        </header>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section style={{ padding: '72px 0 28px', textAlign: 'center', animation: 'asRise 0.6s ease both' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '6px 14px', border: '1px solid rgba(53,212,138,0.28)', borderRadius: 999,
            background: 'rgba(53,212,138,0.06)',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: '#8FE7BD', letterSpacing: '0.02em',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#35D48A',
              boxShadow: '0 0 0 3px rgba(53,212,138,0.25)',
              animation: 'asPulse 2s ease-in-out infinite', display: 'inline-block',
            }} />
            {t.hero.badge}
          </div>

          {/* H1 */}
          <h1 style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700,
            fontSize: 'clamp(46px, 6.8vw, 82px)', lineHeight: 1.01,
            letterSpacing: '-0.038em', margin: '24px auto 0', maxWidth: '14ch',
            color: '#E7ECF3',
          }}>
            {t.hero.titleBefore}{' '}
            <span style={{ color: '#35D48A' }}>{t.hero.titleAccent}</span>
            {' '}{t.hero.titleAfter}
          </h1>

          <p style={{ maxWidth: '54ch', margin: '22px auto 0', color: '#9AA3B2', fontSize: 17.5, lineHeight: 1.65 }}>
            {t.hero.subtitle}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 36, flexWrap: 'wrap' }}>
            <a href="#extension" style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              background: '#35D48A', color: '#08130D', fontWeight: 600, fontSize: 16,
              padding: '14px 26px', borderRadius: 12, textDecoration: 'none',
              boxShadow: '0 12px 34px rgba(53,212,138,0.3)',
            }}>
              <ChromeIcon />
              {t.hero.cta1}
            </a>
            <button onClick={scrollToForm} style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              color: '#C6CDD9', fontWeight: 500, fontSize: 16,
              padding: '14px 22px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)', background: 'none', cursor: 'pointer',
            }}>
              {t.hero.cta2}
            </button>
          </div>

          {/* Trust signals */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, marginTop: 30, flexWrap: 'wrap', fontSize: 14, color: '#8A93A3' }}>
            {t.hero.trust.map((label, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <CheckMark />
                {label}
              </span>
            ))}
          </div>
        </section>

        {/* ── Stat strip ───────────────────────────────────────────────────── */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, margin: '56px 0 0' }}>
          {t.stats.map((stat, i) => (
            <div key={i} style={{
              border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', padding: '24px 26px',
            }}>
              <div style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: 36, color: '#35D48A', letterSpacing: '-0.02em' }}>
                {stat.value}
              </div>
              <div style={{ color: '#9AA3B2', fontSize: 14, marginTop: 5 }}>{stat.label}</div>
            </div>
          ))}
        </section>

        {/* ── Cómo funciona ─────────────────────────────────────────────────── */}
        <section id="como" style={{ padding: '100px 0 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={S.monoLabel}>{t.como.label}</div>
            <h2 style={S.sectionTitle}>{t.como.title}</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {t.como.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <div key={i} style={{
                  border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18,
                  background: 'linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))',
                  padding: '28px 26px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: 'rgba(53,212,138,0.1)', border: '1px solid rgba(53,212,138,0.22)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#35D48A',
                    }}>
                      <Icon size={21} />
                    </div>
                    <span style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: 40, color: 'rgba(255,255,255,0.06)' }}>
                      0{i + 1}
                    </span>
                  </div>
                  <h3 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: 19, margin: '0 0 8px', letterSpacing: '-0.01em', color: '#E7ECF3' }}>
                    {step.title}
                  </h3>
                  <p style={{ color: '#9AA3B2', fontSize: 14.5, lineHeight: 1.65, margin: 0 }}>{step.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Extension ────────────────────────────────────────────────────── */}
        <section id="extension" style={{ padding: '100px 0 28px' }}>
          <div style={{
            border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24,
            background: 'linear-gradient(180deg,rgba(53,212,138,0.05),rgba(255,255,255,0.008))',
            padding: '48px 44px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 44, alignItems: 'center',
          }}>
            <div>
              <div style={{ ...S.monoLabel, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <ChromeIcon />
                {t.ext.label}
              </div>
              <h2 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: 'clamp(26px,3.4vw,40px)', letterSpacing: '-0.03em', margin: '14px 0 12px', lineHeight: 1.1, color: '#E7ECF3' }}>
                {t.ext.title}
              </h2>
              <p style={{ color: '#9AA3B2', fontSize: 16.5, lineHeight: 1.65, margin: '0 0 24px' }}>
                {t.ext.subtitle}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 30 }}>
                {t.ext.bullets.map((b, i) => {
                  const Icon = EXT_ICONS[i];
                  return (
                    <div key={i} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: 'rgba(53,212,138,0.1)', border: '1px solid rgba(53,212,138,0.22)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#35D48A',
                      }}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 2, color: '#E7ECF3' }}>{b.title}</div>
                        <div style={{ color: '#8A93A3', fontSize: 13.5, lineHeight: 1.55 }}>{b.body}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <a
                  href="https://github.com/Joan266/listing-fraud-check-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 10,
                    background: '#35D48A', color: '#08130D', fontWeight: 600, fontSize: 15,
                    padding: '13px 22px', borderRadius: 11, textDecoration: 'none',
                    boxShadow: '0 10px 28px rgba(53,212,138,0.28)',
                  }}
                >
                  <ChromeIcon />
                  {t.ext.cta}
                </a>
                <span style={{ color: '#6B7385', fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace" }}>{t.ext.note}</span>
              </div>
            </div>

            {/* Browser mock */}
            <div>
              <div style={{
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden',
                background: '#0B0F16', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              }}>
                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#F16A6A', display: 'inline-block' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#F2B84B', display: 'inline-block' }} />
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#35D48A', display: 'inline-block' }} />
                  <div style={{ flex: 1, marginLeft: 8, background: '#0A0E15', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '5px 12px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#6B7385' }}>
                    idealista.com/inmueble/98472013
                  </div>
                </div>

                {/* Page body */}
                <div style={{ position: 'relative', padding: 16, minHeight: 265 }}>
                  <div style={{ height: 116, borderRadius: 10, background: 'linear-gradient(135deg,#1a2130,#141a26)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" />
                    </svg>
                    <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#35D48A,transparent)', animation: 'asScanline 3.5s ease-in-out infinite' }} />
                  </div>
                  <div style={{ height: 10, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,0.08)', marginTop: 14 }} />
                  <div style={{ height: 10, width: '56%', borderRadius: 4, background: 'rgba(255,255,255,0.055)', marginTop: 9 }} />
                  <div style={{ height: 10, width: '38%', borderRadius: 4, background: 'rgba(255,255,255,0.038)', marginTop: 9 }} />

                  {/* Popup */}
                  <div style={{
                    position: 'absolute', top: 12, right: 12, width: 206,
                    background: '#0C1017', border: '1px solid rgba(53,212,138,0.3)', borderRadius: 14,
                    boxShadow: '0 18px 48px rgba(0,0,0,0.6)', overflow: 'hidden',
                    animation: 'asFloat 5s ease-in-out infinite',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <div style={{ width: 21, height: 21, borderRadius: 6, background: 'linear-gradient(150deg,#35D48A,#1F9E68)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#08130D" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" />
                        </svg>
                      </div>
                      <span style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: 12 }}>AlquiSeguro</span>
                      <span style={{ marginLeft: 'auto', fontSize: 8, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A93A3', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 99, padding: '2px 5px' }}>Ext</span>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F16A6A', fontWeight: 700, fontSize: 11.5, marginBottom: 8 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
                        </svg>
                        3 señales detectadas
                      </div>
                      {['Precio muy por debajo del mercado', 'Piden transferencia por adelantado', 'Foto reutilizada en 4 sitios'].map((line, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 10.5, lineHeight: 1.4, color: '#B9C0CC', marginBottom: 5 }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#F16A6A', flexShrink: 0, marginTop: 5, display: 'inline-block' }} />
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Seis capas ───────────────────────────────────────────────────── */}
        <section id="capas" style={{ padding: '100px 0 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={S.monoLabel}>{t.capas.label}</div>
            <h2 style={S.sectionTitle}>{t.capas.title}</h2>
            <p style={{ color: '#9AA3B2', fontSize: 16.5, maxWidth: '52ch', margin: '16px auto 0' }}>
              {t.capas.subtitle}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {t.capas.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div
                  key={i}
                  style={{
                    border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16,
                    background: 'rgba(255,255,255,0.02)', padding: '24px 22px',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(53,212,138,0.35)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(53,212,138,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(53,212,138,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#35D48A' }}>
                      <Icon size={19} />
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: '#5E6675' }}>0{i + 1}</span>
                  </div>
                  <h3 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: 17, margin: '0 0 7px', letterSpacing: '-0.01em', color: '#E7ECF3' }}>{f.title}</h3>
                  <p style={{ color: '#9AA3B2', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{f.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Demo form ────────────────────────────────────────────────────── */}
        <section id="demo" ref={formRef} style={{ padding: '100px 0 28px' }}>
          <div style={{
            border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24,
            background: 'linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.008))',
            overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.5)',
          }}>
            <div style={{ padding: '38px 42px 0', textAlign: 'center' }}>
              <div style={S.monoLabel}>{t.form.label}</div>
              <h2 style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: 'clamp(26px,3.4vw,38px)', letterSpacing: '-0.03em', margin: '12px 0 6px', color: '#E7ECF3' }}>
                {t.form.title}
              </h2>
              <p style={{ color: '#9AA3B2', fontSize: 15.5, margin: '0 auto', maxWidth: '48ch' }}>
                {t.form.subtitle}
              </p>
            </div>

            <div style={{ padding: '30px 42px 42px' }}>
              {/* Mode toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'inline-flex', borderRadius: 9, padding: 3, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {(['text', 'url'] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => setInputMode(mode)} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '7px 16px', borderRadius: 7,
                      border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 500,
                      background: inputMode === mode ? '#35D48A' : 'transparent',
                      color: inputMode === mode ? '#08130D' : '#9AA3B2',
                      transition: 'all 0.15s',
                    }}>
                      {mode === 'text' ? <><Type size={14} /> {t.form.modeText}</> : <><LinkIcon size={14} /> {t.form.modeUrl}</>}
                    </button>
                  ))}
                </div>

                {inputMode === 'text' && (
                  <button
                    type="button"
                    onClick={() => setListingText(SCAM_EXAMPLE)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7,
                      fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontSize: 13.5, fontWeight: 500,
                      color: '#8FE7BD', background: 'none',
                      border: '1px dashed rgba(53,212,138,0.4)',
                      borderRadius: 9, padding: '8px 13px', cursor: 'pointer',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(53,212,138,0.7)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(53,212,138,0.4)'; }}
                  >
                    {t.form.useExample}
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                {inputMode === 'text' ? (
                  <textarea
                    value={listingText}
                    onChange={(e) => setListingText(e.target.value)}
                    placeholder={t.form.placeholder}
                    style={{
                      width: '100%', minHeight: 190, resize: 'vertical',
                      background: '#0A0E15', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 14, color: '#E7ECF3', fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                      fontSize: 14.5, lineHeight: 1.65, padding: '16px 18px', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  />
                ) : (
                  <input
                    type="url"
                    value={listingUrl}
                    onChange={(e) => setListingUrl(e.target.value)}
                    placeholder={t.form.placeholderUrl}
                    style={{
                      width: '100%', background: '#0A0E15', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 14, color: '#E7ECF3', fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                      fontSize: 14.5, padding: '16px 18px', outline: 'none', transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.5)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18, flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={(inputMode === 'text' ? !listingText.trim() : !listingUrl.trim()) || isExtracting}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 10,
                      background: '#35D48A', color: '#08130D', fontWeight: 600, fontSize: 15.5,
                      padding: '14px 26px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      boxShadow: '0 10px 28px rgba(53,212,138,0.28)',
                      opacity: ((inputMode === 'text' ? !listingText.trim() : !listingUrl.trim()) || isExtracting) ? 0.5 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {isExtracting ? (
                      <><LoadingSpinner size="sm" color="text-ink" />{inputMode === 'url' ? t.form.extractingUrl : t.form.extracting}</>
                    ) : (
                      <>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" /><path d="m9 12 2 2 4-4" />
                        </svg>
                        {t.form.submit}
                      </>
                    )}
                  </button>
                  <span style={{ color: '#6B7385', fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {t.form.privacy}
                  </span>
                </div>
              </form>

              {!isExtracting && (
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <Link to="/review" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: '#5E6675', textDecoration: 'none' }}>
                    {t.form.skip}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Stack ────────────────────────────────────────────────────────── */}
        <section id="stack" style={{ padding: '100px 0 28px' }}>
          <div style={{
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24,
            background: 'linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.008))',
            padding: '48px 44px',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', marginBottom: 36 }}>
              <div>
                <div style={S.monoLabel}>{t.stack.label}</div>
                <h2 style={{ ...S.sectionTitle, margin: '12px 0 0' }}>{t.stack.title}</h2>
              </div>
              {/* Google Maps Platform award badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                padding: '9px 15px', borderRadius: 999,
                border: '1px solid rgba(66,133,244,0.35)', background: 'rgba(66,133,244,0.08)',
              }}>
                <img src="https://cdn.simpleicons.org/googlemaps/4285F4" width="17" height="17" alt="Google Maps" />
                <span style={{ fontSize: 13.5, color: '#AEC6FF', fontWeight: 500 }}>{t.stack.award}</span>
              </div>
            </div>

            {/* 4-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              {STACK.map((tech) => (
                <div key={tech.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '15px 16px',
                  border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13,
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <img src={tech.icon} width="24" height="24" alt={tech.name} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 600, fontSize: 14.5, color: '#D4DAE4', lineHeight: 1.2 }}>
                      {tech.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6B7385', marginTop: 2 }}>
                      {tech.role[lang]}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div style={{ marginTop: 32, paddingTop: 26, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontSize: 14, color: '#9AA3B2' }}>{t.stack.subtitle}</span>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 80, padding: '42px 0 60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BrandLogo size={28} />
            <div>
              <div style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 700, fontSize: 15.5 }}>
                Alqui<span style={{ color: '#35D48A' }}>Seguro</span>
              </div>
              <div style={{ color: '#6B7385', fontSize: 12 }}>{t.footer.tagline}</div>
            </div>
          </div>
          <div style={{ color: '#5E6675', fontSize: 12.5, fontFamily: "'IBM Plex Mono', monospace" }}>
            {t.footer.portfolio} · {new Date().getFullYear()}
          </div>
        </footer>

      </div>
    </div>
  );
};
