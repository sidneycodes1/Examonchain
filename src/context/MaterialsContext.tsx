'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { Material } from '@/types/database';

interface MaterialsContextType {
  materials: Material[];
  selectedMaterial: Material | null;
  setSelectedMaterial: (m: Material | null) => void;
  refreshMaterials: () => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  loading: boolean;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
}

const MaterialsContext = createContext<MaterialsContextType | undefined>(undefined);

export function MaterialsProvider({ children }: { children: React.ReactNode }) {
  const { getAccessToken, authenticated, ready, logout } = usePrivy();
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const refreshMaterials = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch('/api/materials', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        logout();
        router.push('/login');
        return;
      }

      const data = await res.json() as { success: boolean; data?: Material[] };
      if (data.success && data.data) {
        setMaterials(data.data);
        setSelectedMaterial((prev) => {
          if (prev && data.data?.some((m) => m.id === prev.id)) {
            return prev;
          }
          return data.data?.[0] || null;
        });
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, logout, router]);

  const deleteMaterial = useCallback(async (id: string) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        logout();
        router.push('/login');
        return;
      }

      const data = await res.json() as { success: boolean };
      if (data.success) {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        setSelectedMaterial((prev) => (prev?.id === id ? null : prev));
      }
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  }, [getAccessToken, logout, router]);

  useEffect(() => {
    if (ready && authenticated) {
      refreshMaterials();
    }
  }, [ready, authenticated, refreshMaterials]);

  return (
    <MaterialsContext.Provider
      value={{
        materials,
        selectedMaterial,
        setSelectedMaterial,
        refreshMaterials,
        deleteMaterial,
        loading,
        isUploadModalOpen,
        setIsUploadModalOpen,
      }}
    >
      {children}
    </MaterialsContext.Provider>
  );
}

export function useMaterials() {
  const context = useContext(MaterialsContext);
  if (!context) {
    throw new Error('useMaterials must be used within a MaterialsProvider');
  }
  return context;
}
