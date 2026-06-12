'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import LayoutWrapper from '@/components/dashboard/LayoutWrapper';
import QuizContainer from '@/components/quiz/QuizContainer';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import { Material } from '@/types/database';

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  options: QuizOption[];
}

interface QuizData {
  id: string;
  title: string;
  materialId: string;
  questions: QuizQuestion[];
}

export default function QuizPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const { getAccessToken, authenticated, ready, logout } = usePrivy();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // States to synchronize LayoutWrapper layout
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    const fetchQuizAndMaterials = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;

        // Fetch Quiz details
        const quizRes = await fetch(`/api/quizzes/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (quizRes.status === 401) {
          logout();
          router.push('/login');
          return;
        }

        const quizJson = await quizRes.json() as { success: boolean; data?: QuizData; error?: string };
        if (quizJson.success && quizJson.data) {
          setQuiz(quizJson.data);
        } else {
          setToast({ message: quizJson.error || 'Failed to fetch quiz', type: 'error' });
        }

        // Fetch Materials list for sidebar mapping
        const materialsRes = await fetch('/api/materials', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (materialsRes.status === 401) {
          logout();
          router.push('/login');
          return;
        }

        const materialsJson = await materialsRes.json() as { success: boolean; data?: Material[] };
        if (materialsJson.success && materialsJson.data) {
          setMaterials(materialsJson.data);
          
          if (quizJson.data) {
            const currentMat = materialsJson.data.find(m => m.id === quizJson.data?.materialId);
            if (currentMat) {
              setSelectedMaterial(currentMat);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching quiz details:', err);
        setToast({ message: 'Failed to retrieve quiz details', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (ready && authenticated && id) {
      fetchQuizAndMaterials();
    }
  }, [ready, authenticated, id, getAccessToken, logout, router]);

  const handleClose = () => {
    router.push('/dashboard');
  };

  const handleSelectMaterial = (material: Material) => {
    setSelectedMaterial(material);
    router.push('/dashboard');
  };

  return (
    <LayoutWrapper
      materials={materials}
      selectedMaterial={selectedMaterial}
      onSelectMaterial={handleSelectMaterial}
      onDeleteMaterial={async () => {}}
      onOpenUpload={() => router.push('/dashboard')}
    >
      <div className="flex-1 flex justify-center items-center h-[calc(100vh-4rem)] border-r border-[#2A2A2A]">
        {loading ? (
          <Spinner size="large" />
        ) : quiz ? (
          <QuizContainer
            quiz={quiz}
            onClose={handleClose}
          />
        ) : (
          <div className="text-[#A0A0A0] text-sm">Failed to load quiz details.</div>
        )}
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </LayoutWrapper>
  );
}