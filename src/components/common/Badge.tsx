import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ShieldAlert, Sparkles } from 'lucide-react';

interface BadgeProps {
  status?: string;
  variant?: 'success' | 'warning' | 'danger' | 'primary' | 'info' | 'default' | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  className = '',
  size = 'md',
  showIcon = true,
  children
}) => {
  const textVal = status || (typeof children === 'string' ? children : '');
  const norm = (variant || textVal || '').toUpperCase().trim();

  let style = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let Icon = Sparkles;
  let displayText: React.ReactNode = children || status;

  if (norm === 'SUCCESS' || norm === 'LUNAS' || norm === 'ACTIVE' || norm === 'AKTIF' || norm === 'DISETUJUI') {
    style = 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40';
    Icon = CheckCircle2;
  } else if (norm === 'WARNING' || norm === 'SEBAGIAN' || norm === 'CICILAN' || norm === 'MENUNGGU' || norm === 'PENDING') {
    style = 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40';
    Icon = Clock;
  } else if (norm === 'DANGER' || norm === 'TUNGGAKAN' || norm === 'DITOLAK' || norm === 'CANCELLED' || norm === 'NONAKTIF' || norm === 'INACTIVE') {
    style = 'bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/40';
    Icon = ShieldAlert;
  } else if (norm === 'PRIMARY' || norm === 'INFO') {
    style = 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40';
    Icon = Sparkles;
  } else if (norm === 'BELUM_BAYAR' || norm === 'BELUM BAYAR' || norm === 'BELUM LUNAS') {
    style = 'bg-orange-500/15 text-orange-700 border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/40';
    Icon = AlertCircle;
    if (!children) displayText = 'Belum Bayar';
  } else if (norm === 'BELUM_DITAGIH') {
    style = 'bg-slate-500/10 text-slate-500 border-slate-300 dark:border-slate-700 dark:text-slate-400';
    Icon = Clock;
    if (!children) displayText = 'Belum Ditagih';
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1 font-semibold',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-medium',
    lg: 'px-3 py-1.5 text-sm gap-2 font-semibold'
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium transition-all
        ${sizeClasses[size]}
        ${style}
        ${className}
      `}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />}
      <span>{displayText}</span>
    </span>
  );
};
