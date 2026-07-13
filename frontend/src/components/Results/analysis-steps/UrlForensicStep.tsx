import React from 'react';
import { Shield, Clock, Archive, AlertTriangle, CheckCircle } from 'lucide-react';
import UrlPreview from '../../UI/UrlPreview';

interface UrlForensicsStepProps {
  inputs_used: {
    listing_url?: string;
  };
  result: {
    domain_age?: any;
    blacklist_check?: any;
    archive_check?: any;
  };
  theme?: 'light' | 'dark';
}

const CARD: React.CSSProperties = {
  padding: '16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.07)',
};

const LABEL: React.CSSProperties = { color: '#E7ECF3', fontWeight: 600, fontSize: 14, margin: 0 };
const DIM: React.CSSProperties = { color: '#9AA3B2', fontSize: 13, margin: '4px 0 0 0' };

const StatusIcon: React.FC<{ ok: boolean }> = ({ ok }) =>
  ok
    ? <CheckCircle style={{ width: 16, height: 16, color: '#35D48A', flexShrink: 0 }} />
    : <AlertTriangle style={{ width: 16, height: 16, color: '#F2B84B', flexShrink: 0 }} />;

const UrlForensicsStep: React.FC<UrlForensicsStepProps> = ({ inputs_used, result, theme = 'dark' }) => {
  const extractDomainAge = (d: any) => {
    if (!d || typeof d !== 'object') return null;
    return { years: d.reason || d.age || 0, status: !d.is_new };
  };

  const extractBlacklistCheck = (d: any) => {
    if (!d || typeof d !== 'object') return null;
    return { clean: d.is_blacklisted === false };
  };

  const extractArchiveCheck = (d: any) => {
    if (!d || typeof d !== 'object') return null;
    return { found: d.found !== false, consistent: d.consistent !== false };
  };

  const domainAge    = extractDomainAge(result.domain_age);
  const blacklist    = extractBlacklistCheck(result.blacklist_check);
  const archive      = extractArchiveCheck(result.archive_check);

  const getDomain = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

  if (!inputs_used.listing_url) {
    return (
      <div style={CARD}>
        <p style={{ color: '#9AA3B2', margin: 0 }}>No se proporcionó URL para el análisis</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h4 style={{ ...LABEL, marginBottom: 12 }}>URL analizada</h4>
        <UrlPreview
          url={inputs_used.listing_url}
          title={`Anuncio en ${getDomain(inputs_used.listing_url)}`}
          description="Anuncio de alquiler bajo análisis forense"
          theme={theme}
        />
      </div>

      <div>
        <h4 style={{ ...LABEL, marginBottom: 16 }}>Resultados del análisis de seguridad</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {domainAge && (
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Clock style={{ width: 16, height: 16, color: '#F2B84B', flexShrink: 0 }} />
                <span style={LABEL}>Antigüedad</span>
                <StatusIcon ok={domainAge.status} />
              </div>
              <p style={{ color: domainAge.status ? '#35D48A' : '#F16A6A', fontWeight: 600, fontSize: 14, margin: 0 }}>
                {domainAge.years}
              </p>
              <p style={DIM}>{domainAge.status ? 'Dominio establecido' : 'Dominio nuevo'}</p>
            </div>
          )}

          {blacklist && (
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Shield style={{ width: 16, height: 16, color: '#F2B84B', flexShrink: 0 }} />
                <span style={LABEL}>Lista negra</span>
                <StatusIcon ok={blacklist.clean} />
              </div>
              <p style={{ color: blacklist.clean ? '#35D48A' : '#F16A6A', fontWeight: 600, fontSize: 14, margin: 0 }}>
                {blacklist.clean ? 'Limpio' : 'Listado'}
              </p>
              <p style={DIM}>{blacklist.clean ? 'No aparece en listas negras' : 'Encontrado en listas negras'}</p>
            </div>
          )}

          {archive && (
            <div style={CARD}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Archive style={{ width: 16, height: 16, color: '#F2B84B', flexShrink: 0 }} />
                <span style={LABEL}>Historial</span>
                <StatusIcon ok={archive.found} />
              </div>
              <p style={{ color: archive.found ? '#35D48A' : '#F2B84B', fontWeight: 600, fontSize: 14, margin: 0 }}>
                {archive.found ? 'Encontrado' : 'No encontrado'}
              </p>
              <p style={DIM}>{archive.consistent ? 'Historial consistente' : 'Datos inconsistentes'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UrlForensicsStep;
