'use client';

import React from 'react';

interface InputProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  disabled?: boolean;
  error?: boolean;
  label?: string;
  className?: string;
}

export default function Input({
  placeholder,
  value,
  onChange,
  type = 'text',
  disabled = false,
  error = false,
  label,
  className = '',
}: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-[#F5F5F7] mb-2">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full h-10 px-4 py-2 rounded-lg
          bg-[#0D0D0D] border border-[#2A2A2A]
          text-[#F5F5F7] placeholder-[#A0A0A0]
          focus:outline-none focus:border-[#00C896] transition-colors duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-[#FF3B30]' : ''}
          ${className}
        `}
      />
      {error && <p className="text-[#FF3B30] text-xs mt-1">Invalid input</p>}
    </div>
  );
}