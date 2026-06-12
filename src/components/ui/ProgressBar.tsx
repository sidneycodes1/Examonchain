'use client';

import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  color?: 'success' | 'warning' | 'error';
  className?: string;
}

export default function ProgressBar({
  value,
  color = 'success',
  className = '',
}: ProgressBarProps) {
  const colorStyles = {
    success: 'bg-[#00C896]',
    warning: 'bg-[#FFB800]',
    error: 'bg-[#FF3B30]',
  };

  return (
    <div
      className={`w-full h-1 bg-[#2A2A2A] rounded-full overflow-hidden ${className}`}
    >
      <div
        className={`h-full transition-all duration-300 ${colorStyles[color]}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      ></div>
    </div>
  );
}