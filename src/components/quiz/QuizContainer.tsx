'use client';

import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import QuizResults from './QuizResults';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  questionText: string;
  options: Option[];
}

interface Quiz {
  id: string;
  title: string;
  materialId: string;
  questions: Question[];
}

interface QuizContainerProps {
  quiz: Quiz;
  onClose: () => void;
}

export default function QuizContainer({ quiz, onClose }: QuizContainerProps) {
  const { getAccessToken } = usePrivy();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // questionId -> optionId
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    resultId: string;
    score: number;
    tokensEarned: number;
    txHash: string | null;
  } | null>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100);

  const handleSelectOption = (optionId: string) => {
    if (submissionResult) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.questions.length) {
      if (!confirm(`You have answered ${answeredCount} out of ${quiz.questions.length} questions. Submit anyway?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          quizId: quiz.id,
          answers,
        }),
      });

      const data = await res.json() as {
        success: boolean;
        resultId: string;
        score: number;
        tokensEarned: number;
        txHash: string | null;
        error?: string;
      };

      if (data.success) {
        setSubmissionResult({
          resultId: data.resultId,
          score: data.score,
          tokensEarned: data.tokensEarned,
          txHash: data.txHash,
        });
      } else {
        alert(data.error || 'Failed to submit quiz');
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      alert('Network error occurred during submission');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return (
      <div className="flex-1 bg-[#0D0D0D] flex flex-col items-center justify-center gap-4 h-[calc(100vh-4rem)]">
        <Spinner size="large" />
        <p className="text-sm font-semibold text-[#00C896] animate-pulse">
          Calculating score...
        </p>
      </div>
    );
  }

  if (submissionResult) {
    return (
      <div className="flex-1 bg-[#0D0D0D] flex items-center justify-center p-6 h-[calc(100vh-4rem)] overflow-y-auto">
        <QuizResults
          resultId={submissionResult.resultId}
          score={submissionResult.score}
          tokensEarned={submissionResult.tokensEarned}
          txHash={submissionResult.txHash}
          materialId={quiz.materialId}
          onClose={onClose}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#0D0D0D] p-6 lg:p-8 overflow-y-auto h-[calc(100vh-4rem)] flex flex-col justify-between max-w-3xl mx-auto w-full">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#F5F5F7] truncate max-w-[250px] md:max-w-md">
              {quiz.title}
            </h1>
            <p className="text-xs text-[#A0A0A0] mt-0.5">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </p>
          </div>
          <Button variant="secondary" size="small" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-[#1A1A1A] rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-[#00C896] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Center Question Area */}
      <div className="my-8 flex-1 flex flex-col justify-center gap-6">
        <h2 className="text-md md:text-lg font-semibold text-[#F5F5F7] leading-relaxed">
          {currentQuestion.questionText}
        </h2>

        <div className="flex flex-col gap-3">
          {currentQuestion.options.map((opt) => {
            const isSelected = answers[currentQuestion.id] === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between text-sm ${
                  isSelected
                    ? 'border-[#00C896] bg-[#00C896]/5 text-[#00C896] font-semibold'
                    : 'border-[#2A2A2A] bg-[#1A1A1A]/40 text-[#F5F5F7] hover:border-[#00C896]/40 hover:bg-[#1A1A1A]/80'
                }`}
              >
                <span>{opt.text}</span>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-[#00C896] bg-[#00C896]' : 'border-[#A0A0A0]'
                  }`}
                >
                  {isSelected && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0D0D0D]"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between border-t border-[#2A2A2A] pt-4 mt-auto">
        <Button
          variant="secondary"
          size="medium"
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        {isLastQuestion ? (
          <Button
            variant="primary"
            size="medium"
            onClick={handleSubmit}
            disabled={submitting}
            className="min-w-[120px]"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            variant="primary"
            size="medium"
            onClick={handleNext}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
