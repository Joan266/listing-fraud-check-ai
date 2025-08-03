import React from 'react';

interface ScoreGaugeProps {
  score: number;
  title: string;
  theme: 'light' | 'dark';
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, title, theme }) => {
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10B981'; 
    if (score >= 50) return '#F59E0B'; 
    return '#EF4444'; 
  };

  const getScoreText = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke={theme === 'dark' ? '#374151' : '#E5E7EB'}
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke={getScoreColor(score)}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray,
              strokeDashoffset,
              transition: 'stroke-dashoffset 1s ease-in-out'
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="text-center mt-2">
        <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {title}
        </h3>
        <p className="text-xs" style={{ color: getScoreColor(score) }}>
          {getScoreText(score)}
        </p>
      </div>
    </div>
  );
};

export default ScoreGauge;