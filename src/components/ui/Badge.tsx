'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'accent' | 'error' | 'warning';
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7]',
    accent: 'bg-[#E8F8F3] text-[#00C896]',
    error: 'bg-[#FF3B30] text-white',
    warning: 'bg-[#FFB800] text-[#0D0D0D]',
  };

  return (
    <span
      className={`
        inline-block px-2 py-1 rounded text-xs font-semibold
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}