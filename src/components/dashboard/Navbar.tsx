import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import PrivyAuthButton from '@/components/auth/PrivyAuthButton';

interface NavbarProps {
  walletAddress?: string;
  tokenBalance?: number;
}

export default function Navbar({
  walletAddress: propWalletAddress,
  tokenBalance,
}: NavbarProps) {
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address || propWalletAddress;

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[#1A1A1A] border-b border-[#2A2A2A] z-50 flex items-center justify-between px-6">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#00C896] flex items-center justify-center text-[#0D0D0D] font-bold text-sm">
          E
        </div>
        <h1 className="text-lg font-bold text-[#F5F5F7]">ExamChain</h1>
      </div>

      {/* CENTER */}
      {walletAddress && (
        <div className="hidden md:flex flex-col items-center text-center">
          <p className="text-sm text-[#A0A0A0]">
            Wallet: {truncateAddress(walletAddress)}
          </p>
          <p className="text-xs text-[#A0A0A0]">
            {tokenBalance || 0} EXB
          </p>
        </div>
      )}

      {/* RIGHT */}
      <div className="flex items-center gap-4 relative">
        {/* Settings Button */}
        <a
          href="/settings"
          className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <svg className="w-6 h-6 text-[#F5F5F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>

        {/* Privy Auth Button */}
        <PrivyAuthButton />
      </div>
    </nav>
  );
}