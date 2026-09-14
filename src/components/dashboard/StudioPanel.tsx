'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivySafe as usePrivy } from '@/components/auth/PrivySafeProvider';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import { Material } from '@/types/database';

const studioOutputs = [
  { id: 1, label: 'Quiz', icon: '📋' },
  { id: 2, label: 'Flashcards', icon: '📝' },
  { id: 3, label: 'Mind Map', icon: '🗺️' },
  { id: 4, label: 'Slide Deck', icon: '📊', beta: true },
  { id: 5, label: 'Reports', icon: '📈' },
  { id: 6, label: 'Data Table', icon: '📋' },
];

interface StudioPanelProps {
  selectedMaterial?: Material | null;
}

export default function StudioPanel({ selectedMaterial = null }: StudioPanelProps) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const handleOutputClick = async (label: string) => {
    if (label !== 'Quiz') {
      setToast({ message: `${label} feature is coming soon!`, type: 'info' });
      return;
    }

    if (!selectedMaterial) {
      setToast({ message: 'Select a material first', type: 'error' });
      return;
    }

    setGenerating(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ materialId: selectedMaterial.id }),
      });

      const data = await res.json() as { success: boolean; quizId?: string; error?: string };

      if (data.success && data.quizId) {
        router.push(`/quiz/${data.quizId}`);
      } else {
        setToast({
          message: data.error || 'Failed to generate quiz',
          type: 'error',
          actionLabel: 'Retry',
          onAction: () => handleOutputClick('Quiz'),
        });
      }
    } catch (err) {
      console.error('Quiz generation error:', err);
      setToast({
        message: 'Failed to generate quiz due to network error',
        type: 'error',
        actionLabel: 'Retry',
        onAction: () => handleOutputClick('Quiz'),
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full lg:w-80 bg-[#0D0D0D] border-l border-[#2A2A2A] p-6 flex flex-col gap-4 h-[calc(100vh-4rem)] flex-shrink-0 relative">
      {/* Title */}
      <h2 className="text-lg font-bold text-[#F5F5F7]">Studio</h2>

      {/* Studio Outputs Grid */}
      <div className="grid grid-cols-2 gap-2">
        {studioOutputs.map((output) => {
          const isQuiz = output.label === 'Quiz';
          const isWorking = isQuiz && generating;

          return (
            <Card
              key={output.id}
              onClick={!generating ? () => handleOutputClick(output.label) : undefined}
              className={`flex flex-col items-center justify-center p-4 gap-2 cursor-pointer transition-all duration-200 relative min-h-[100px] ${
                generating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.03] active:scale-[0.98]'
              } ${isWorking ? 'border-[#00C896] bg-[#00C896]/5' : ''}`}
            >
              {isWorking ? (
                <div className="flex flex-col items-center gap-2">
                  <Spinner size="small" />
                  <span className="text-[10px] font-semibold text-[#00C896] text-center animate-pulse">
                    Generating...
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-3xl">{output.icon}</span>
                  <span className="text-xs font-semibold text-[#F5F5F7] text-center">
                    {output.label}
                  </span>
                  {output.beta && (
                    <Badge variant="accent" className="absolute top-2 right-2 text-[9px] px-1 py-0.5">
                      BETA
                    </Badge>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex-1 flex flex-col items-center justify-end gap-2 py-6 text-center">
        <svg className="w-8 h-8 text-[#A0A0A0]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        <p className="text-xs text-[#A0A0A0]">
          Studio outputs will be saved here
        </p>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}