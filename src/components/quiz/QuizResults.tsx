'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivySafe as usePrivy } from '@/components/auth/PrivySafeProvider';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';

interface QuizResultsProps {
  resultId: string;
  score: number;
  tokensEarned: number;
  txHash: string | null;
  materialId: string;
  onClose: () => void;
}

export default function QuizResults({
  resultId,
  score,
  tokensEarned,
  txHash,
  materialId,
  onClose,
}: QuizResultsProps) {
  const router = useRouter();
  const { getAccessToken } = usePrivy();
  const [retaking, setRetaking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(txHash);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  const handleRetake = async () => {
    setRetaking(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ materialId }),
      });

      const data = await res.json() as { success: boolean; quizId?: string; error?: string };
      if (data.success && data.quizId) {
        router.push(`/quiz/${data.quizId}`);
        router.refresh();
      } else {
        setToast({
          message: data.error || 'Failed to generate new quiz',
          type: 'error',
          actionLabel: 'Retry',
          onAction: () => handleRetake(),
        });
      }
    } catch (err) {
      console.error('Retake quiz error:', err);
      setToast({
        message: 'Failed to retake quiz due to network error',
        type: 'error',
        actionLabel: 'Retry',
        onAction: () => handleRetake(),
      });
    } finally {
      setRetaking(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/submissions/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ resultId }),
      });

      const data = await res.json() as { success: boolean; txHash?: string; error?: string };
      if (data.success && data.txHash) {
        setCurrentTxHash(data.txHash);
        setToast({ message: 'Tokens claimed successfully via Solana devnet!', type: 'success' });
      } else {
        setToast({
          message: data.error || 'Failed to claim tokens',
          type: 'error',
          actionLabel: 'Retry',
          onAction: () => handleClaim(),
        });
      }
    } catch (err) {
      console.error('Claim retry error:', err);
      setToast({
        message: 'Failed to claim tokens due to network error',
        type: 'error',
        actionLabel: 'Retry',
        onAction: () => handleClaim(),
      });
    } finally {
      setClaiming(false);
    }
  };

  const hasTokens = score >= 70;

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-8 max-w-md w-full mx-auto flex flex-col items-center gap-6 text-center shadow-xl">
      <div className="text-5xl">
        {hasTokens ? '🎉' : '📚'}
      </div>

      <div>
        <h2 className="text-xl font-bold text-[#F5F5F7]">Quiz Completed!</h2>
        <p className="text-sm text-[#A0A0A0] mt-1">
          You scored <span className="font-bold text-[#F5F5F7]">{score}%</span>
        </p>
      </div>

      {hasTokens ? (
        <div className="bg-[#00C896]/10 border border-[#00C896]/30 rounded-xl p-6 w-full flex flex-col items-center gap-3">
          <div className="text-xs font-semibold text-[#00C896] uppercase tracking-wider">
            Tokens Earned
          </div>
          <div className="text-3xl font-extrabold text-[#00C896]">
            {tokensEarned} EXB
          </div>
          {currentTxHash ? (
            <a
              href={`https://explorer.solana.com/tx/${currentTxHash}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00C896] hover:underline flex items-center gap-1 font-medium mt-1"
            >
              <span>View on Solana Explorer</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-2 mt-1 w-full">
              <Button
                variant="primary"
                size="small"
                onClick={handleClaim}
                disabled={claiming}
                className="w-full flex items-center justify-center gap-2 text-xs"
              >
                {claiming ? (
                  <>
                    <Spinner size="small" />
                    <span>Claiming...</span>
                  </>
                ) : (
                  <span>Claim Tokens</span>
                )}
              </Button>
              <p className="text-[9px] text-[#A0A0A0] leading-relaxed">
                Connect your Phantom wallet in Settings, then click Claim.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-xl p-4 w-full text-sm text-[#FF3B30] font-semibold">
          Keep studying! Score at least 70% to earn EXB tokens.
        </div>
      )}

      <div className="flex flex-col gap-2 w-full mt-2">
        <Button
          variant="primary"
          onClick={handleRetake}
          disabled={retaking}
          className="w-full flex items-center justify-center gap-2"
        >
          {retaking ? (
            <>
              <Spinner size="small" />
              <span>Generating New Quiz...</span>
            </>
          ) : (
            <span>Retake Quiz</span>
          )}
        </Button>
        <Button variant="secondary" onClick={onClose} className="w-full">
          Back to Dashboard
        </Button>
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
