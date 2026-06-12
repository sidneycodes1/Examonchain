'use client';

import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Toast({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  actionLabel,
  onAction,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const bgColor = {
    success: 'bg-[#00C896] border-l-4 border-[#00C896]',
    error: 'bg-[#FF3B30] border-l-4 border-[#FF3B30]',
    info: 'bg-[#1A1A1A] border-l-4 border-[#00C896]',
  };

  const textColor = {
    success: 'text-[#0D0D0D]',
    error: 'text-white',
    info: 'text-[#F5F5F7]',
  };

  const buttonClass = {
    success: 'bg-[#0D0D0D]/10 hover:bg-[#0D0D0D]/20 text-[#0D0D0D]',
    error: 'bg-white/10 hover:bg-white/20 text-white',
    info: 'bg-white/10 hover:bg-white/20 text-[#F5F5F7]',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm">
      <div
        className={`
          ${bgColor[type]}
          ${textColor[type]}
          px-5 py-4 rounded-lg shadow-lg
          animate-slide-up
          flex items-center justify-between gap-4
        `}
      >
        <span className="text-xs font-semibold leading-relaxed">{message}</span>
        {actionLabel && onAction && (
          <button
            onClick={() => {
              onAction();
              setIsVisible(false);
              onClose?.();
            }}
            className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${buttonClass[type]}`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}