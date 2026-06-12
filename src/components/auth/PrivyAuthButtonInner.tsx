'use client';

import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

export default function PrivyAuthButtonInner() {
  const { ready, authenticated, login, logout, user, unlinkWallet } = usePrivy();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!ready) {
    return (
      <div className="flex items-center justify-center w-8 h-8">
        <Spinner size="small" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Button variant="primary" size="small" onClick={login}>
        Login with Phantom
      </Button>
    );
  }

  const walletAddress = user?.wallet?.address;
  const truncateAddress = (addr?: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const handleDisconnect = async () => {
    if (unlinkWallet && walletAddress) {
      try {
        await unlinkWallet(walletAddress);
      } catch (err) {
        console.error('Failed to unlink wallet:', err);
      }
    }
    await logout();
    setShowDropdown(false);
  };

  const handleLogout = async () => {
    await logout();
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#00C896] transition-colors"
      >
        <div className="w-6 h-6 rounded-full bg-[#00C896] flex items-center justify-center text-[#0D0D0D] font-bold text-xs">
          {walletAddress ? walletAddress.slice(2, 4).toUpperCase() : 'U'}
        </div>
        <span className="text-xs font-medium text-[#F5F5F7]">
          {truncateAddress(walletAddress)}
        </span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-lg py-2 z-50">
          <button
            onClick={handleDisconnect}
            className="w-full text-left px-4 py-2 text-sm text-[#F5F5F7] hover:bg-[#2A2A2A] transition-colors"
          >
            Disconnect Wallet
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-[#F5F5F7] hover:bg-[#2A2A2A] transition-colors border-t border-[#2A2A2A] mt-2 pt-2"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
