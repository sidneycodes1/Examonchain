'use client';

import React from 'react';
import ChatArea from '@/components/dashboard/ChatArea';
import Spinner from '@/components/ui/Spinner';
import { useMaterials } from '@/context/MaterialsContext';
import { Material } from '@/types/database';

export default function Chat() {
  const { materials, selectedMaterial, setSelectedMaterial, loading } =
    useMaterials();

  const handlePick = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = materials.find((m) => m.id === e.target.value) || null;
    setSelectedMaterial(found);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-4rem)]">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] min-w-0 min-h-0">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[#2A2A2A] bg-[#0D0D0D] flex-shrink-0">
        <label htmlFor="chat-material" className="text-xs font-semibold text-[#A0A0A0] whitespace-nowrap">
          Material:
        </label>
        {materials.length === 0 ? (
          <p className="text-xs text-[#A0A0A0]">
            Upload a study material from the dashboard first.
          </p>
        ) : (
          <select
            id="chat-material"
            value={selectedMaterial?.id || ''}
            onChange={handlePick}
            className="flex-1 min-w-0 h-9 px-3 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-xs text-[#F5F5F7] focus:outline-none focus:border-[#00C896]"
          >
            {materials.map((m: Material) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden [&>div]:!h-full [&>div]:!border-r-0">
        <ChatArea selectedMaterial={selectedMaterial} />
      </div>
    </div>
  );
}
