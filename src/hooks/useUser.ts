'use client';

import { usePrivy } from '@privy-io/react-auth';

export function useUser() {
  const { ready, authenticated, user } = usePrivy();

  // Extract the wallet address from user object
  const walletAddress = user?.wallet?.address || null;
  const userId = user?.id || null;

  return {
    user,
    isReady: ready,
    isAuthenticated: authenticated,
    walletAddress,
    userId,
  };
}