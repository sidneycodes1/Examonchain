'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivySafe } from '@/components/auth/PrivySafeProvider';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';

interface ProfileData {
  id: string;
  privyId: string;
  phantomWallet: string;
  email: string | null;
  name: string | null;
  totalTokensEarned: number;
}

interface PendingClaim {
  id: string;
  amount: number;
  status: string;
  quiz_result_id: string;
}

export default function Settings() {
  const router = useRouter();
  const {
    ready,
    authenticated,
    user,
    getAccessToken,
    logout,
    linkWallet,
    unlinkWallet,
  } = usePrivySafe();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/login');
    }
  }, [ready, authenticated, router]);

  const fetchAll = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const profileRes = await fetch('/api/profile', { headers });
      if (profileRes.status === 401) {
        await logout();
        router.push('/login');
        return;
      }
      const profileJson = (await profileRes.json()) as {
        success: boolean;
        data?: ProfileData;
      };
      if (profileJson.success && profileJson.data) {
        setProfile(profileJson.data);
      }

      const claimsRes = await fetch('/api/submissions/claim', { headers });
      const claimsJson = (await claimsRes.json()) as {
        success: boolean;
        data?: PendingClaim[];
      };
      if (claimsJson.success && claimsJson.data) {
        setClaims(claimsJson.data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, logout, router]);

  useEffect(() => {
    if (ready && authenticated) {
      fetchAll();
    }
  }, [ready, authenticated, fetchAll]);

  const walletAddress: string | undefined =
    user?.wallet?.address || profile?.phantomWallet;

  const isTempWallet =
    !walletAddress || walletAddress.startsWith('temp-');

  const handleLinkWallet = async () => {
    setLinking(true);
    try {
      if (typeof linkWallet === 'function') {
        await linkWallet();
        await fetchAll();
      } else {
        setToast({ message: 'Wallet linking is not available right now', type: 'error' });
      }
    } catch (err) {
      console.error('Link wallet failed:', err);
      setToast({ message: 'Failed to link wallet', type: 'error' });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkWallet = async () => {
    if (!walletAddress || isTempWallet) return;
    if (!confirm('Unlink this wallet from your account?')) return;
    try {
      await unlinkWallet(walletAddress);
      await fetchAll();
      setToast({ message: 'Wallet unlinked', type: 'success' });
    } catch (err) {
      console.error('Unlink wallet failed:', err);
      setToast({ message: 'Failed to unlink wallet', type: 'error' });
    }
  };

  const handleClaim = async (resultId: string) => {
    setClaimingId(resultId);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/submissions/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resultId }),
      });
      const data = (await res.json()) as {
        success: boolean;
        txHash?: string;
        error?: string;
      };
      if (data.success) {
        setToast({ message: 'Tokens claimed successfully via Solana devnet!', type: 'success' });
        await fetchAll();
      } else {
        setToast({ message: data.error || 'Failed to claim tokens', type: 'error' });
      }
    } catch (err) {
      console.error('Claim failed:', err);
      setToast({ message: 'Network error during claim', type: 'error' });
    } finally {
      setClaimingId(null);
    }
  };

  if (!ready || loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-4rem)]">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] p-6 lg:p-8 bg-[#0D0D0D]">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <h1 className="text-xl font-bold text-[#F5F5F7]">Settings</h1>

        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[#F5F5F7]">Profile</h2>
          <div className="text-xs text-[#A0A0A0] flex flex-col gap-1">
            <p>
              Privy ID: <span className="text-[#F5F5F7] break-all">{profile?.privyId || user?.id || '—'}</span>
            </p>
            <p>
              Email: <span className="text-[#F5F5F7]">{profile?.email || user?.email?.address || '—'}</span>
            </p>
            <p>
              Name: <span className="text-[#F5F5F7]">{profile?.name || '—'}</span>
            </p>
            <p>
              Total EXB earned: <span className="text-[#00C896] font-bold">{profile?.totalTokensEarned ?? 0} EXB</span>
            </p>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[#F5F5F7]">Phantom wallet</h2>
          {isTempWallet ? (
            <>
              <p className="text-xs text-[#A0A0A0]">
                No wallet linked yet. Link your Phantom wallet to receive EXB rewards.
              </p>
              <Button variant="primary" size="medium" onClick={handleLinkWallet} disabled={linking} className="w-fit">
                {linking ? 'Linking...' : 'Link Phantom wallet'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-[#A0A0A0] break-all">
                Linked: <span className="text-[#F5F5F7]">{walletAddress}</span>
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="small" onClick={handleUnlinkWallet}>
                  Unlink wallet
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-[#F5F5F7]">Pending EXB claims</h2>
          {claims.length === 0 ? (
            <p className="text-xs text-[#A0A0A0]">No pending or failed claims. Quiz rewards will appear here if a transfer needs a retry.</p>
          ) : (
            claims.map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#2A2A2A] bg-[#0D0D0D]"
              >
                <div className="text-xs">
                  <p className="text-[#F5F5F7] font-semibold">{claim.amount} EXB</p>
                  <p className="text-[#A0A0A0]">Status: {claim.status}</p>
                </div>
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => handleClaim(claim.quiz_result_id)}
                  disabled={claimingId === claim.quiz_result_id}
                >
                  {claimingId === claim.quiz_result_id ? 'Claiming...' : 'Retry claim'}
                </Button>
              </div>
            ))
          )}
        </Card>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
