'use client';

import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footerAction?: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footerAction,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl shadow-xl max-w-2xl w-11/12 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
            <h2 className="text-xl font-bold text-[#F5F5F7]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[#A0A0A0] hover:text-[#F5F5F7] text-2xl leading-none"
            >
              ×
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>

        {/* Footer */}
        {footerAction && (
          <div className="flex justify-end gap-4 p-6 border-t border-[#2A2A2A]">
            {footerAction}
          </div>
        )}
      </div>
    </div>
  );
}