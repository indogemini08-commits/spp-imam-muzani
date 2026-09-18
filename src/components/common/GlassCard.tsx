import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  glow?: 'teal' | 'blue' | 'none';
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  glow = 'none',
  onClick
}) => {
  const glowClass =
    glow === 'teal'
      ? 'shadow-glow-teal'
      : glow === 'blue'
      ? 'shadow-glow-blue'
      : '';

  return (
    <div
      onClick={onClick}
      className={`
        glass-panel
        ${hoverEffect ? 'glass-panel-hover cursor-pointer' : ''}
        ${glowClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
