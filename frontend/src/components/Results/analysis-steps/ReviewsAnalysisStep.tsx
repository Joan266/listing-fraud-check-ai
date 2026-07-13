import React from 'react';
import { Star, Users, TrendingUp, AlertTriangle, MessageSquare } from 'lucide-react';

interface Review {
  review_text?: string;
  review_date?: string;
  review_name?: string;
  rating?: number;
  [key: string]: any;
}

interface ReviewsAnalysisStepProps {
  inputs_used: {
    reviews?: Review[];
  };
  result: {
    sentiment?: string;
    reason?: string;
    negative_themes?: string[];
  };
  theme?: 'light' | 'dark';
}

const CARD: React.CSSProperties = {
  padding: '16px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.08)',
};

const SENTIMENT_STYLES: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  positive: { color: '#35D48A', bg: 'rgba(53,212,138,0.08)',  border: 'rgba(53,212,138,0.25)',  emoji: '😊' },
  negative: { color: '#F16A6A', bg: 'rgba(241,106,106,0.08)', border: 'rgba(241,106,106,0.25)', emoji: '😞' },
  mixed:    { color: '#F2B84B', bg: 'rgba(242,184,75,0.08)',  border: 'rgba(242,184,75,0.25)',  emoji: '😐' },
};
const DEFAULT_SENTIMENT = { color: '#7A8496', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', emoji: '😶' };

const ReviewsAnalysisStep: React.FC<ReviewsAnalysisStepProps> = ({ inputs_used, result, theme: _theme = 'dark' }) => {
  const reviews   = inputs_used.reviews ?? [];
  const sentiment = result.sentiment?.toLowerCase() ?? '';
  const ss        = SENTIMENT_STYLES[sentiment] ?? DEFAULT_SENTIMENT;

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        style={{ width: 14, height: 14, color: i < Math.floor(rating) ? '#F2B84B' : 'rgba(255,255,255,0.15)', fill: i < Math.floor(rating) ? '#F2B84B' : 'transparent' }}
      />
    ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overview */}
      <div style={{ ...CARD, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ padding: 10, borderRadius: 10, background: 'rgba(242,184,75,0.1)', flexShrink: 0 }}>
            <Users style={{ width: 22, height: 22, color: '#F2B84B' }} />
          </div>
          <div>
            <h4 style={{ color: '#E7ECF3', fontFamily: '"Space Grotesk", sans-serif', fontSize: 18, fontWeight: 700, margin: 0 }}>
              Análisis de reseñas
            </h4>
            <p style={{ color: '#9AA3B2', fontSize: 13, margin: '2px 0 0' }}>
              {reviews.length} reseñas analizadas
            </p>
          </div>
        </div>

        {/* Sentiment card */}
        <div style={{ padding: '14px 16px', borderRadius: 10, background: ss.bg, border: `1px solid ${ss.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{ss.emoji}</span>
            <div>
              <span style={{ color: '#9AA3B2', fontSize: 12, display: 'block' }}>Sentimiento general</span>
              <span style={{ color: ss.color, fontWeight: 700, fontSize: 15 }}>{result.sentiment ?? 'Neutral'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reason */}
      {result.reason && (
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <TrendingUp style={{ width: 16, height: 16, color: '#F2B84B', flexShrink: 0, marginTop: 2 }} />
            <div>
              <h5 style={{ color: '#E7ECF3', fontWeight: 600, fontSize: 14, margin: '0 0 8px 0' }}>
                Resumen del análisis
              </h5>
              <p style={{ color: '#9AA3B2', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{result.reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Negative themes */}
      {result.negative_themes && result.negative_themes.length > 0 && (
        <div style={{ ...CARD, background: 'rgba(241,106,106,0.05)', border: '1px solid rgba(241,106,106,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#F16A6A', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <h5 style={{ color: '#E7ECF3', fontWeight: 600, fontSize: 14, margin: '0 0 12px 0' }}>
                Quejas recurrentes ({result.negative_themes.length})
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.negative_themes.map((theme_item, index) => (
                  <div
                    key={index}
                    style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(241,106,106,0.08)' }}
                  >
                    <p style={{ color: '#F16A6A', fontSize: 13, margin: 0 }}>{theme_item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No complaints */}
      {result.negative_themes && result.negative_themes.length === 0 && (
        <div style={{ ...CARD, background: 'rgba(53,212,138,0.05)', border: '1px solid rgba(53,212,138,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#35D48A', flexShrink: 0 }} />
            <span style={{ color: '#35D48A', fontWeight: 600, fontSize: 14 }}>Sin quejas recurrentes</span>
          </div>
        </div>
      )}

      {/* Sample reviews */}
      {reviews.length > 0 && (
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <MessageSquare style={{ width: 16, height: 16, color: '#F2B84B' }} />
            <h5 style={{ color: '#E7ECF3', fontWeight: 600, fontSize: 14, margin: 0 }}>
              Reseñas de ejemplo ({Math.min(3, reviews.length)} de {reviews.length})
            </h5>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reviews.slice(0, 3).map((review, index) => (
              <div
                key={index}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.025)',
                  borderLeft: '2px solid rgba(53,212,138,0.4)',
                  paddingLeft: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: review.review_text ? 8 : 0 }}>
                  {review.rating && (
                    <div style={{ display: 'flex', gap: 2 }}>{renderStars(review.rating)}</div>
                  )}
                  {review.review_name && (
                    <span style={{ color: '#C6CDD9', fontSize: 13, fontWeight: 500 }}>{review.review_name}</span>
                  )}
                  {review.review_date && (
                    <span style={{ color: '#6B7385', fontSize: 11 }}>{review.review_date}</span>
                  )}
                </div>
                {review.review_text && (
                  <p style={{ color: '#9AA3B2', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                    {review.review_text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsAnalysisStep;
