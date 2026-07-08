import React from 'react';

const StarfieldBg: React.FC = () => (
  <div
    className="absolute inset-0 overflow-hidden pointer-events-none"
    style={{
      backgroundImage: [
        'linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)',
      ].join(','),
      backgroundSize: '40px 40px',
    }}
  >
    <div
      className="absolute inset-0"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, rgba(59,130,246,0.08) 0%, transparent 70%)',
      }}
    />
  </div>
);

export default StarfieldBg;
