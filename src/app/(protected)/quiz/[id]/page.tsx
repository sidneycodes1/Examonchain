'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import LayoutWrapper from '@/components/dashboard/LayoutWrapper';
import QuizContainer from '@/components/quiz/QuizContainer';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import { useMaterials } from '@/context/MaterialsContext';

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
  const { materials, selectedMaterial, setSelectedMaterial } = useMaterials();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login');
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    const fetchQuizDetails = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;

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
      } catch (err) {
        console.error('Error fetching quiz details:', err);
        setToast({ message: 'Failed to retrieve quiz details', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (ready && authenticated && id) {
      fetchQuizDetails();
    }
  }, [ready, authenticated, id, getAccessToken, logout, router]);

  // Sync the context's selected material with the quiz's source material
  useEffect(() => {
    if (quiz && materials.length > 0) {
      const currentMat = materials.find(m => m.id === quiz.materialId);
      if (currentMat && selectedMaterial?.id !== currentMat.id) {
        setSelectedMaterial(currentMat);
      }
    }
  }, [quiz, materials, selectedMaterial, setSelectedMaterial]);

  return (
    <LayoutWrapper>
      <div className="flex-1 flex justify-center items-center h-[calc(100vh-4rem)] border-r border-[#2A2A2A]">
        {loading ? (
          <Spinner size="large" />
        ) : quiz ? (
          <QuizContainer
            quiz={quiz}
            onClose={() => router.push('/dashboard')}
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