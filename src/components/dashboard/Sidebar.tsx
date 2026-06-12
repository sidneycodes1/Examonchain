'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { Material } from '@/types/database';

interface SidebarProps {
  materials: Material[];
  selectedMaterial: Material | null;
  onSelectMaterial: (material: Material) => void;
  onDeleteMaterial: (id: string) => void;
  onOpenUpload: () => void;
}

export default function Sidebar({
  materials,
  selectedMaterial,
  onSelectMaterial,
  onDeleteMaterial,
  onOpenUpload,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMaterials = materials.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType?: string | null) => {
    const isPDF = fileType?.includes('pdf') || false;
    if (isPDF) {
      return (
        <svg className="w-5 h-5 text-[#FF3B30]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-[#00C896]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  };

  return (
    <div className="w-full lg:w-72 bg-[#0D0D0D] border-r border-[#2A2A2A] p-6 flex flex-col gap-4 h-[calc(100vh-4rem)] flex-shrink-0">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#F5F5F7]">Sources</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#A0A0A0]">
          {materials.length}
        </span>
      </div>

      {/* Upload Button */}
      <Button variant="primary" size="medium" className="w-full justify-center gap-2" onClick={onOpenUpload}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Upload Material
      </Button>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search materials..."
          className="w-full h-10 pl-10 pr-4 py-2 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F7] placeholder-[#A0A0A0] focus:outline-none focus:border-[#00C896] text-sm"
        />
        <svg className="w-4 h-4 text-[#A0A0A0] absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Materials List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 -mx-2 px-2">
        {filteredMaterials.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
            <svg className="w-10 h-10 text-[#A0A0A0]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-center text-[#A0A0A0] text-xs max-w-[80%] leading-relaxed">
              {searchQuery ? 'No materials match your search' : 'Uploaded materials appear here'}
            </p>
          </div>
        ) : (
          filteredMaterials.map((material) => {
            const isSelected = selectedMaterial?.id === material.id;
            return (
              <div
                key={material.id}
                onClick={() => onSelectMaterial(material)}
                className={`group flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#00C896]/5 border-[#00C896] shadow-[0_0_12px_rgba(0,200,150,0.05)]'
                    : 'bg-[#1A1A1A]/40 border-transparent hover:bg-[#1A1A1A]/80 hover:border-[#2A2A2A]'
                }`}
              >
                {/* File Icon */}
                <div className="flex-shrink-0 mt-0.5">{getFileIcon(material.file_type)}</div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[#00C896]' : 'text-[#F5F5F7]'}`}>
                    {material.title}
                  </p>
                  <p className="text-[10px] text-[#A0A0A0] mt-0.5">
                    {formatBytes(material.file_size_bytes || 0)}
                  </p>
                </div>

                {/* Delete Action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this material?')) {
                      onDeleteMaterial(material.id);
                    }
                  }}
                  className="flex-shrink-0 text-[#A0A0A0] hover:text-[#FF3B30] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all p-1 -m-1"
                  title="Delete material"
                  aria-label="Delete material"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}