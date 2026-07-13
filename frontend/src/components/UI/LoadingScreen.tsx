import React, { useState, useEffect } from 'react';
import BrandLogo from './BrandLogo';
import { useAppSelector } from '../../hooks/redux';

const TIPS = [
  'Verifica siempre la identidad del propietario antes de realizar cualquier pago.',
  'Nunca pagues una fianza mediante transferencias instantáneas de efectivo.',
  'Confía en tu instinto. Si una oferta parece demasiado buena para ser real, probablemente lo sea.',
  'Programa una videollamada para ver la propiedad y conocer al anfitrión.',
];

export const LoadingScreen: React.FC = () => {
  const { loadingMessage } = useAppSelector((state) => state.app);
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 2, 95));
    }, 800);

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 7000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(tipInterval);
    };
  }, []);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#090C12',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 480, width: '100%' }}>
        {/* Logo with glow rings */}
        <div
          style={{
            width: 96,
            height: 96,
            margin: '0 auto 28px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1.5px solid rgba(53,212,138,0.2)',
              animation: 'asPulse 2s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 10,
              borderRadius: '50%',
              border: '1.5px solid rgba(53,212,138,0.38)',
              animation: 'asPulse 2s ease-in-out infinite 0.35s',
            }}
          />
          <BrandLogo size={48} />
        </div>

        <h2
          style={{
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-0.025em',
            color: '#E7ECF3',
            margin: '0 0 28px',
          }}
        >
          {loadingMessage || 'Cargando…'}
        </h2>

        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            maxWidth: 360,
            margin: '0 auto 36px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 99,
            height: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 99,
              background: 'linear-gradient(90deg, #1F9E68, #35D48A)',
              width: `${progress}%`,
              transition: 'width 0.5s ease-out',
            }}
          />
        </div>

        {/* Tip */}
        <div>
          <p
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#35D48A',
              margin: '0 0 10px',
            }}
          >
            Consejo
          </p>
          <p
            style={{
              fontStyle: 'italic',
              color: '#9AA3B2',
              fontSize: 14.5,
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            &ldquo;{TIPS[tipIndex]}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
};
