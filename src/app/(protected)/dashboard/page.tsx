'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import LayoutWrapper from '@/components/dashboard/LayoutWrapper';
import Modal from '@/components/ui/Modal';
import FileDropZone from '@/components/upload/FileDropZone';
import { Material } from '@/types/database';

export default function DashboardPage() {
  const { getAccessToken, authenticated, ready, logout } = usePrivy();
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  useEffect(() => {
    const fetchMaterials = async () => {
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

        const data = await res.json() as { success: boolean; data?: Material[]; error?: string };
        if (data.success && data.data) {
          setMaterials(data.data);
          if (data.data.length > 0 && !selectedMaterial) {
            setSelectedMaterial(data.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch materials:', err);
      }
    };

    if (ready && authenticated) {
      fetchMaterials();
    }
  }, [ready, authenticated, getAccessToken, selectedMaterial, logout, router]);

  const handleUploadComplete = (newMaterial: Material) => {
    setMaterials((prev) => [newMaterial, ...prev]);
    setSelectedMaterial(newMaterial);
    setIsUploadModalOpen(false);
  };

  const handleDeleteMaterial = async (id: string) => {
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
        if (selectedMaterial?.id === id) {
          setSelectedMaterial(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  };

  return (
    <>
      <LayoutWrapper
        materials={materials}
        selectedMaterial={selectedMaterial}
        onSelectMaterial={setSelectedMaterial}
        onDeleteMaterial={handleDeleteMaterial}
        onOpenUpload={() => setIsUploadModalOpen(true)}
      />

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload Study Material"
      >
        <div className="py-2">
          <FileDropZone
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </Modal>
    </>
  );
}