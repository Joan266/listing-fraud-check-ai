import React, { useState } from 'react';
import { MessageCircle, X, Shield } from 'lucide-react';
import { ChatMessage } from '../../types/index';
import LoadingSpinner from '../UI/LoadingSpinner';

interface FloatingChatProps {
  chatMessages: ChatMessage[];
  isSending: boolean;
  newMessage: string;
  onMessageChange: (v: string) => void;
  onSend: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  analysisTitle?: string;
}

const SUGGESTIONS = [
  '¿Cuál es el mayor riesgo detectado?',
  '¿Es fiable el anfitrión?',
  '¿Qué debo verificar antes de reservar?',
];

const FloatingChat: React.FC<FloatingChatProps> = ({
  chatMessages,
  isSending,
  newMessage,
  onMessageChange,
  onSend,
  scrollRef,
  chatEndRef,
  analysisTitle,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuggestion = (text: string) => {
    onMessageChange(text);
    // Trigger send after state update
    setTimeout(onSend, 0);
  };

  return (
    <>
      {/* Panel */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          right: 26,
          bottom: 96,
          zIndex: 70,
          width: 400,
          maxWidth: 'calc(100vw - 52px)',
          height: 'min(600px, 72vh)',
          background: '#0C1017',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 22,
          display: 'flex',
          flexDirection: 'column',
          animation: 'rpPanel 0.28s cubic-bezier(0.2,0.8,0.2,1) both',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Shield size={16} style={{ color: '#35D48A' }} />
            <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: 15, color: '#E7ECF3', flex: 1 }}>
              {analysisTitle ? `Sobre: ${analysisTitle.split(',')[0]}` : 'Asistente del informe'}
            </span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#35D48A', flexShrink: 0 }} />
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7385', display: 'flex', alignItems: 'center', padding: 4 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Suggestion chips */}
          {chatMessages.length === 0 && (
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0 }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(s)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 9,
                    padding: '9px 13px',
                    color: '#C6CDD9',
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px' }}
          >
            {chatMessages.map((message, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start', animation: 'rpMsg 0.25s ease both' }}>
                <div style={{
                  maxWidth: '82%', fontSize: 13.5, lineHeight: 1.55, padding: '11px 14px',
                  borderRadius: message.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: message.role === 'user' ? '#35D48A' : 'rgba(255,255,255,0.04)',
                  border: message.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  color: message.role === 'user' ? '#08130D' : '#D6DCE6',
                }}>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.content}</p>
                </div>
              </div>
            ))}
            {isSending && chatMessages[chatMessages.length - 1]?.role === 'user' && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '12px 15px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px 14px 14px 4px' }}>
                  <LoadingSpinner size="sm" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input row */}
          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', flexShrink: 0 }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isSending && onSend()}
              placeholder="Pregunta sobre el análisis…"
              disabled={isSending}
              style={{
                flex: 1, background: '#0A0E15', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, color: '#E7ECF3', fontFamily: "'IBM Plex Sans'",
                fontSize: 13.5, padding: '10px 13px', outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(53,212,138,0.4)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
            <button
              onClick={onSend}
              disabled={!newMessage.trim() || isSending}
              style={{
                width: 40, height: 40, flexShrink: 0, borderRadius: 10, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: newMessage.trim() && !isSending ? '#35D48A' : 'rgba(255,255,255,0.06)',
                color: newMessage.trim() && !isSending ? '#08130D' : '#5E6675',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Launcher button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed',
          right: 26,
          bottom: 26,
          zIndex: 60,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: '#35D48A',
          color: '#08130D',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 999,
          padding: '13px 20px',
          fontFamily: "'Space Grotesk'",
          fontWeight: 700,
          fontSize: 14,
          boxShadow: '0 14px 40px rgba(53,212,138,0.35)',
          transition: 'transform 0.1s',
        }}
      >
        <MessageCircle size={17} />
        {isOpen ? 'Cerrar' : 'Preguntar'}
      </button>
    </>
  );
};

export default FloatingChat;
