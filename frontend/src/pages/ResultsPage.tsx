import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Shield,
  RotateCcw,
  MapPin,
  Home,
  ExternalLink,
} from 'lucide-react';
import ScoreGauge from '../components/UI/ScoreGauge';
import { gsap } from 'gsap';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { pollAnalysisStatus, sendChatMessageAsync, setCurrentAnalysisId } from '../store/appSlice';
import { ChatMessage } from '../types/index';
import { toast } from 'react-hot-toast';
import { LoadingScreen } from '../components/UI/LoadingScreen';
import { AnalysisProgress } from '../components/UI/AnalysisProgress';
import { FlagsCard } from '../components/Results/FlagsCard';
import { AnalysisRunbook } from '../components/Results/AnalysisRubook';
import { FailedAnalysis } from '../components/UI/FailedAnalysis';
import BrandLogo from '../components/UI/BrandLogo';
import ListingSidebar from '../components/Results/ListingSidebar';
import FloatingChat from '../components/Results/FloatingChat';

const card = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.02)',
  padding: '24px',
} as React.CSSProperties;

const ResultsPage: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const analysis = useAppSelector(state =>
    state.app.sessionHistory.find(a => a.id === analysisId)
  );
  const neighborhoodData = analysis?.analysis_steps?.find(
    step => step.job_name === 'neighborhood_analysis'
  )?.result;
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(analysis?.chat?.messages || []);

  const { isPolling } = useAppSelector(state => state.app);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (analysisId) {
      dispatch(setCurrentAnalysisId(analysisId));
      if (!isPolling && (!analysis || analysis.status === 'PENDING' || analysis.status === 'IN_PROGRESS')) {
        dispatch(pollAnalysisStatus(analysisId)).unwrap().catch((err: Error) => {
          setFetchError(err.message || 'No se pudo cargar el análisis.');
        });
      }
    }
  }, [analysisId, analysis, isPolling, dispatch]);

  useEffect(() => {
    if (analysis?.chat?.messages) {
      setChatMessages(analysis.chat.messages);
    } else {
      setChatMessages([]);
    }
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [analysisId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !analysis?.chat?.id || !analysisId) return;
    const userMessage: ChatMessage = { role: 'user', content: newMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsSending(true);
    try {
      const { aiMessage } = await dispatch(sendChatMessageAsync({
        analysisId: analysisId,
        chatId: analysis.chat.id,
        message: newMessage
      })).unwrap();
      setChatMessages(prev => [...prev, aiMessage]);
    } catch {
      toast.error("Error al enviar el mensaje.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRerunAnalysis = () => {
    if (analysis) navigate('/review', { state: { extractedData: analysis.input_data } });
  };

  const { sessionId } = useAppSelector(state => state.app);

  if (!analysis || analysis.status === 'PENDING' || analysis.status === 'IN_PROGRESS') {
    if (fetchError) {
      return (
        <div style={{ minHeight: '100vh', background: '#090C12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#E7ECF3' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#F16A6A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
          </svg>
          <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 22, margin: 0 }}>Análisis no disponible</h2>
          <p style={{ color: '#9AA3B2', fontSize: 15, margin: 0, textAlign: 'center', maxWidth: 360 }}>
            Este análisis no existe o fue creado en otra sesión del navegador.
          </p>
          <button onClick={() => navigate('/')} style={{ marginTop: 8, padding: '10px 22px', borderRadius: 10, background: '#35D48A', color: '#08130D', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}>
            Verificar otro anuncio
          </button>
        </div>
      );
    }
    if (analysisId) return <AnalysisProgress checkId={analysisId} sessionId={sessionId} />;
    return <LoadingScreen />;
  }
  if (analysis.status === 'FAILED') {
    return <FailedAnalysis analysis={analysis} onRerun={handleRerunAnalysis} />;
  }

  const { final_report, analysis_steps } = analysis;
  const report = final_report && 'authenticity_score' in final_report ? final_report : null;

  const authScore = report?.authenticity_score ?? 0;
  const qualScore = report?.quality_score ?? 0;
  const authDeg = Math.round((authScore / 100) * 360);

  const listingDomain = (() => {
    try { return analysis.input_data.listing_url ? new URL(analysis.input_data.listing_url).hostname.replace('www.', '') : null; }
    catch { return null; }
  })();

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1100px 620px at 50% -10%, rgba(53,212,138,0.09), transparent 60%), #090C12', position: 'relative' }}>
      <div ref={containerRef} style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px 80px', position: 'relative' }}>

        {/* Nav */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <BrandLogo size={32} />
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em' }}>
              Alqui<span style={{ color: '#35D48A' }}>Seguro</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#6B7385' }}>
              Informe #{analysisId?.slice(0, 8)}
            </span>
            <button onClick={handleRerunAnalysis}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#C6CDD9', fontSize: 13.5, padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'none', cursor: 'pointer' }}
            >
              <RotateCcw size={14} /> Verificar otro anuncio
            </button>
          </div>
        </header>

        {/* Title + metadata row */}
        <div style={{ padding: '26px 0 30px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, letterSpacing: '0.14em', color: '#35D48A', textTransform: 'uppercase' }}>
            Informe de verificación
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 'clamp(30px,4.4vw,46px)', letterSpacing: '-0.03em', margin: '12px 0 0', lineHeight: 1.05 }}>
            {analysis.input_data?.address || 'Anuncio analizado'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap', color: '#9AA3B2', fontSize: 14 }}>
            {analysis.input_data?.address && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <MapPin size={13} style={{ color: '#6B7385' }} />
                {analysis.input_data.address.split(',').slice(0, 2).join(',')}
              </span>
            )}
            {analysis.input_data?.property_type && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Home size={13} style={{ color: '#6B7385' }} />
                {analysis.input_data.property_type}
              </span>
            )}
            {listingDomain && (
              <span style={{ padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }}>
                {listingDomain}
              </span>
            )}
            {analysis.input_data?.listing_url && (
              <a href={analysis.input_data.listing_url} target="_blank" rel="noopener noreferrer"
                style={{ color: '#35D48A', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                Ver anuncio original <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Verdict row */}
        {report && (
          <section style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 18, marginBottom: 22 }}>
            {/* Score card */}
            <div style={{ border: '1px solid rgba(53,212,138,0.28)', borderRadius: 20, background: 'linear-gradient(180deg,rgba(53,212,138,0.06),rgba(255,255,255,0.01))', padding: '30px 32px', display: 'flex', alignItems: 'center', gap: 30, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
                <div style={{ width: 132, height: 132, borderRadius: '50%', background: `conic-gradient(#35D48A ${authDeg}deg, rgba(255,255,255,0.08) 0)` }} />
                <div style={{ position: 'absolute', inset: 11, borderRadius: '50%', background: '#0B0F16', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 42, color: '#35D48A', lineHeight: 1 }}>{authScore}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: '#6B7385', marginTop: 3 }}>Autenticidad</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 210 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 13px', borderRadius: 999, background: '#35D48A', color: '#08130D', fontWeight: 700, fontFamily: "'IBM Plex Mono'", fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {authScore >= 70 ? 'Riesgo bajo' : authScore >= 40 ? 'Riesgo medio' : 'Riesgo alto'}
                </div>
                <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 22, margin: '14px 0 8px', letterSpacing: '-0.02em' }}>
                  {report.sidebar_summary?.slice(0, 60) || 'Evaluación general'}
                </h2>
                <p style={{ color: '#AEB6C3', fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>{report.sidebar_summary}</p>
              </div>
            </div>

            {/* Quality card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ ...card, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ color: '#9AA3B2', fontSize: 14 }}>Calidad del anuncio</span>
                  <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: 30, color: '#35D48A' }}>
                    {qualScore}<span style={{ fontSize: 15, color: '#5E6675' }}>/100</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.08)', marginTop: 14, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: qualScore + '%', borderRadius: 99, background: 'linear-gradient(90deg,#1F9E68,#35D48A)', animation: 'rpBar 1s ease both' }} />
                </div>
              </div>
              {report.flags && (
                <div style={{ ...card, display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {[
                        { label: 'positivas', color: '#35D48A', count: report.flags.filter((f: any) => f.category === 'Positive').length },
                        { label: 'medias', color: '#F2B84B', count: report.flags.filter((f: any) => f.category === 'Medium').length },
                        { label: 'altas', color: '#6B7385', count: report.flags.filter((f: any) => f.category === 'High').length },
                      ].map((s, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: s.color, fontWeight: 600, fontSize: 14 }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                          {s.count} {s.label}
                        </span>
                      ))}
                    </div>
                    <div style={{ color: '#6B7385', fontSize: 12.5, marginTop: 6 }}>
                      {report.flags.length} señales detectadas en {analysis_steps?.length ?? 0} verificaciones
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Main grid */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 22, alignItems: 'start' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* Flags */}
            {report && <FlagsCard flags={report.flags} />}

            {/* Explanation */}
            {report && (
              <div style={card}>
                <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 18, margin: '0 0 16px' }}>Explicación detallada</h2>
                <p style={{ color: '#AEB6C3', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{report.explanation}</p>
              </div>
            )}

            {/* Analysis steps */}
            <AnalysisRunbook steps={analysis_steps ?? []} theme="dark" />

          </div>

          {/* Right column — ListingSidebar */}
          <div style={{ position: 'sticky', top: 20 }}>
            <ListingSidebar analysis={analysis} neighborhoodData={neighborhoodData} />
          </div>
        </section>

      </div>

      {/* Floating chat */}
      <FloatingChat
        chatMessages={chatMessages}
        isSending={isSending}
        newMessage={newMessage}
        onMessageChange={setNewMessage}
        onSend={handleSendMessage}
        scrollRef={scrollRef}
        chatEndRef={chatEndRef}
        analysisTitle={analysis.input_data?.address}
      />
    </div>
  );
};

export default ResultsPage;
