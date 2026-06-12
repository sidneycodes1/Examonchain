'use client';

import React from 'react';

interface MobileBottomTabsProps {
  activeTab: 'sources' | 'chat' | 'studio';
  onTabChange: (tab: 'sources' | 'chat' | 'studio') => void;
}

export default function MobileBottomTabs({
  activeTab,
  onTabChange,
}: MobileBottomTabsProps) {
  const tabs = [
    { id: 'sources', label: 'Sources', icon: '📁' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'studio', label: 'Studio', icon: '✨' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 lg:hidden bg-[#1A1A1A] border-t border-[#2A2A2A] flex items-center justify-around z-40">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as 'sources' | 'chat' | 'studio')}
          className={`flex flex-col items-center justify-center gap-1 py-2 px-4 transition-colors ${
            activeTab === tab.id
              ? 'text-[#00C896] border-b-2 border-[#00C896]'
              : 'text-[#A0A0A0]'
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-xs">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}