'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // For now, redirect to dashboard
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4 text-[#F5F5F7]">ExamChain</h1>
        <p className="text-lg mb-8 text-[#A0A0A0]">
          Study Smarter. Earn Crypto. Prove It.
        </p>
        <p className="text-[#A0A0A0]">Loading...</p>
      </div>
    </div>
  );
}