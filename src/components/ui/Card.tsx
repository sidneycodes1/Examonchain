'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-4 md:p-5 hover:border-[#00C896] transition-colors duration-200 ${className}`}
    >
      {children}
    </div>
  );
}