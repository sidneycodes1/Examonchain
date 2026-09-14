'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivySafe } from '@/components/auth/PrivySafeProvider';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

export default function Login() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivySafe();

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/dashboard');
    }
  }, [ready, authenticated, router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D0D0D]">
        <Spinner size="large" />
      </div>
    );
  }

  if (authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D0D0D]">
        <p className="text-sm text-[#A0A0A0]">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0D0D0D] p-6">
      <Card className="w-full max-w-md flex flex-col items-center gap-6 !p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#00C896] flex items-center justify-center text-[#0D0D0D] font-bold text-xl">
          E
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F7]">Welcome to ExamChain</h1>
          <p className="text-sm text-[#A0A0A0] mt-2">
            Study Smarter. Earn Crypto. Prove It.
          </p>
        </div>
        <div className="w-full flex flex-col gap-3">
          <Button variant="primary" size="large" className="w-full" onClick={() => login()}>
            Login
          </Button>
          <p className="text-xs text-[#A0A0A0] leading-relaxed">
            Email, Google OAuth, and Phantom wallet supported via Privy.
          </p>
        </div>
        <a href="/signup" className="text-xs text-[#00C896] hover:underline">
          New here? Create an account
        </a>
      </Card>
    </div>
  );
}
