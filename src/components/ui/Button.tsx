'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'medium',
  disabled = false,
  isLoading = false,
  children,
  onClick,
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap';
  
  const sizeStyles = {
    small: 'px-3 py-2 text-xs h-8',
    medium: 'px-6 py-2 text-sm h-10',
    large: 'px-8 py-3 text-base h-12',
  };
  
  const variantStyles = {
    primary: `bg-[#00C896] text-[#0D0D0D] hover:bg-[#00A876] active:bg-[#008B5E] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `border border-[#A0A0A0] text-[#F5F5F7] hover:border-[#00C896] hover:text-[#00C896] active:bg-[#2A2A2A] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    danger: `bg-[#FF3B30] text-white hover:bg-[#E60000] active:bg-[#CC0000] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
}