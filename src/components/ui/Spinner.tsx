'use client';

import React from 'react';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function Spinner({
  size = 'medium',
  className = '',
}: SpinnerProps) {
  const sizes = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className={`${sizes[size]} ${className}`}>
      <div
        className="w-full h-full border-2 border-[#00C896] border-t-transparent rounded-full animate-spin"
      ></div>
    </div>
  );
}