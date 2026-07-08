import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ size = 40, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Rounded square background */}
    <rect x="2" y="2" width="36" height="36" rx="8" fill="#FACC15" />
    {/* House silhouette */}
    <path
      d="M20 9L8 19V31H15V24H25V31H32V19L20 9Z"
      fill="#1F2937"
    />
    {/* Checkmark inside house */}
    <path
      d="M14 22L18 26L26 17"
      stroke="#FACC15"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default BrandLogo;
