import React from 'react';
import { DollarSign, MapPin, Home, Users, Calendar, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface PriceAnalysisStepProps {
  inputs_used: {
    address?: string;
    description?: string;
    price_details?: string;
    property_type?: string;
  };
  result: {
    reason?: string;
    verdict?: string;
  };
  theme?: 'light' | 'dark';
}

const CARD: React.CSSProperties = {
  padding: '16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.06)',
};

const VERDICT_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  reasonable:   { color: '#35D48A', bg: 'rgba(53,212,138,0.08)',  border: 'rgba(53,212,138,0.25)' },
  suspicious:   { color: '#F2B84B', bg: 'rgba(242,184,75,0.08)',  border: 'rgba(242,184,75,0.25)' },
  unreasonable: { color: '#F16A6A', bg: 'rgba(241,106,106,0.08)', border: 'rgba(241,106,106,0.25)' },
};
const DEFAULT_VERDICT = { color: '#7A8496', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' };

const VerdictIcon: React.FC<{ verdict: string }> = ({ verdict }) => {
  const v = verdict?.toLowerCase();
  if (v === 'reasonable')   return <CheckCircle style={{ width: 20, height: 20, color: '#35D48A' }} />;
  if (v === 'suspicious')   return <AlertTriangle style={{ width: 20, height: 20, color: '#F2B84B' }} />;
  if (v === 'unreasonable') return <XCircle style={{ width: 20, height: 20, color: '#F16A6A' }} />;
  return <DollarSign style={{ width: 20, height: 20, color: '#7A8496' }} />;
};

const extractPrice = (s: string) => { const m = s.match(/€\s*([0-9,]+)/); return m ? m[0] : s; };
const extractDuration = (s: string) => {
  const w = s.match(/(\d+)\s*week/i);
  const d = s.match(/(\d+)\s*day/i);
  const n = s.match(/(\d+)\s*night/i);
  if (w) return `${w[1]} week${w[1] !== '1' ? 's' : ''}`;
  if (d) return `${d[1]} day${d[1] !== '1' ? 's' : ''}`;
  if (n) return `${n[1]} night${n[1] !== '1' ? 's' : ''}`;
  return 'Duración de la estancia';
};
const extractGuests = (s: string) => { const m = s.match(/(\d+)\s*adult/i); return m ? `${m[1]} adultos` : 'Huéspedes'; };
const extractAccommodation = (s: string, fallback?: string) => {
  const suite = s.match(/(\d+)\s*suite/i);
  const room  = s.match(/(\d+)\s*room/i);
  if (suite) return `${suite[1]} suite${suite[1] !== '1' ? 's' : ''}`;
  if (room)  return `${room[1]} room${room[1] !== '1' ? 's' : ''}`;
  return fallback || 'Alojamiento';
};
const truncate = (text: string, max = 200) => text.length <= max ? text : text.slice(0, max) + '…';

const PriceAnalysisStep: React.FC<PriceAnalysisStepProps> = ({ inputs_used, result, theme: _theme = 'dark' }) => {
  const price    = inputs_used.price_details ?? '';
  const verdict  = result.verdict ?? 'unknown';
  const vs       = VERDICT_STYLES[verdict.toLowerCase()] ?? DEFAULT_VERDICT;

  const iconColor = '#F2B84B';
  const iconStyle = { width: 18, height: 18, color: iconColor, flexShrink: 0 as const };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Price overview card */}
      <div style={{ ...CARD, padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ padding: 10, borderRadius: 10, background: 'rgba(242,184,75,0.1)', flexShrink: 0 }}>
            <DollarSign style={{ width: 22, height: 22, color: '#F2B84B' }} />
          </div>
          <div>
            <h4 style={{ color: '#E7ECF3', fontFamily: '"Space Grotesk", sans-serif', fontSize: 20, fontWeight: 700, margin: 0 }}>
              {price ? extractPrice(price) : 'Precio no disponible'}
            </h4>
            <p style={{ color: '#9AA3B2', fontSize: 13, margin: '2px 0 0' }}>
              {price ? extractDuration(price) : 'Duración no especificada'}
            </p>
          </div>
        </div>

        {/* Detail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { Icon: Home,     label: 'Propiedad', value: extractAccommodation(price, inputs_used.property_type) },
            { Icon: Users,    label: 'Huéspedes', value: extractGuests(price) },
            { Icon: Calendar, label: 'Duración',  value: extractDuration(price) },
            { Icon: MapPin,   label: 'Ubicación',  value: inputs_used.address ? inputs_used.address.split(',')[0] : 'No especificada' },
          ].map(({ Icon, label, value }) => (
            <div key={label} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <Icon style={iconStyle} />
                <span style={{ color: '#E7ECF3', fontWeight: 600, fontSize: 13 }}>{label}</span>
              </div>
              <p style={{ color: '#9AA3B2', fontSize: 13, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div style={{ padding: '14px 16px', borderRadius: 10, background: vs.bg, border: `1px solid ${vs.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: result.reason ? 8 : 0 }}>
            <VerdictIcon verdict={verdict} />
            <div>
              <span style={{ color: '#9AA3B2', fontSize: 12, display: 'block' }}>Análisis de precio</span>
              <span style={{ color: vs.color, fontWeight: 700, fontSize: 15 }}>{verdict}</span>
            </div>
          </div>
          {result.reason && (
            <p style={{ color: '#C6CDD9', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{result.reason}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {inputs_used.description && (
        <div style={CARD}>
          <h5 style={{ color: '#E7ECF3', fontWeight: 600, fontSize: 14, margin: '0 0 10px 0' }}>
            Descripción de la propiedad
          </h5>
          <p style={{ color: '#9AA3B2', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            {truncate(inputs_used.description)}
          </p>
        </div>
      )}

      {/* Full address */}
      {inputs_used.address && (
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <MapPin style={{ ...iconStyle, marginTop: 1 }} />
            <div>
              <h5 style={{ color: '#E7ECF3', fontWeight: 600, fontSize: 14, margin: '0 0 6px 0' }}>
                Dirección completa
              </h5>
              <p style={{ color: '#9AA3B2', fontSize: 13, margin: 0 }}>{inputs_used.address}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceAnalysisStep;
