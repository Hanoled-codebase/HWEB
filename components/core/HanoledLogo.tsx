import React from 'react';

interface LogoProps {
  variant?: 'horizontal' | 'stacked' | 'icon-only';
  theme?: 'light' | 'dark' | 'blue' | 'gold';
  size?: number;
}

export const HanoledLogo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  theme = 'light',
  size = 32,
}) => {
  // Determine color based on theme
  const getIconColor = () => {
    switch (theme) {
      case 'dark':
        return '#FFFFFF';
      case 'blue':
        return '#1447E6';
      case 'gold':
        return '#F5A623';
      case 'light':
      default:
        return '#1447E6';
    }
  };

  const getTextColor = () => {
    switch (theme) {
      case 'dark':
        return '#FFFFFF';
      case 'light':
      default:
        return '#0B1220';
    }
  };

  const iconColor = getIconColor();
  const textColor = getTextColor();

  const iconSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Left Pillar */}
      <rect x="22" y="16" width="16" height="68" rx="8" fill={iconColor} />
      {/* Right Pillar */}
      <rect x="62" y="16" width="16" height="68" rx="8" fill={iconColor} />
      {/* Ascending Growth Line */}
      <path
        d="M36 64L64 34"
        stroke={iconColor}
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'icon-only') {
    return iconSvg;
  }

  if (variant === 'stacked') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        {iconSvg}
        <span
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 700,
            fontSize: `${size * 0.75}px`,
            color: textColor,
            letterSpacing: '-0.03em',
          }}
        >
          Hanoled
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: `${size * 0.35}px` }}>
      {iconSvg}
      <span
        style={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 700,
          fontSize: `${size * 0.75}px`,
          color: textColor,
          letterSpacing: '-0.03em',
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.25rem',
        }}
      >
        Hanoled
        <span
          style={{
            fontSize: `${size * 0.35}px`,
            fontWeight: 600,
            color: '#1447E6',
            backgroundColor: '#EEF3FF',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          CORE
        </span>
      </span>
    </div>
  );
};
