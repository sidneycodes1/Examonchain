'use client';

import React, { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import StudioPanel from './StudioPanel';
import MobileBottomTabs from './MobileBottomTabs';
import { Material } from '@/types/database';

interface LayoutWrapperProps {
  materials?: Material[];
  selectedMaterial?: Material | null;
  onSelectMaterial?: (material: Material) => void;
  onDeleteMaterial?: (id: string) => void;
  onOpenUpload?: () => void;
  children?: React.ReactNode;
}

export default function LayoutWrapper({
  materials = [],
  selectedMaterial = null,
  onSelectMaterial = () => {},
  onDeleteMaterial = () => {},
  onOpenUpload = () => {},
  children,
}: LayoutWrapperProps) {
  const { getAccessToken, authenticated, ready, logout } = usePrivy();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'sources' | 'chat' | 'studio'>('chat');
  const [profile, setProfile] = useState<{ phantomWallet?: string; totalTokensEarned?: number } | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const res = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          logout();
          router.push('/login');
          return;
        }

        const data = await res.json() as { success: boolean; data?: { phantomWallet?: string; totalTokensEarned?: number } };
        if (data.success && data.data) {
          setProfile(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch profile in layout:', err);
      }
    };

    if (ready && authenticated) {
      fetchProfile();
    }
  }, [ready, authenticated, getAccessToken, logout, router]);

  const renderSidebar = () => (
    <Sidebar
      materials={materials}
      selectedMaterial={selectedMaterial}
      onSelectMaterial={onSelectMaterial}
      onDeleteMaterial={onDeleteMaterial}
      onOpenUpload={onOpenUpload}
    />
  );

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Navbar */}
      <Navbar walletAddress={profile?.phantomWallet} tokenBalance={profile?.totalTokensEarned} />

      {/* Main Content */}
      <div className="pt-16 pb-16 lg:pb-0 flex flex-col lg:flex-row w-full overflow-x-hidden">
        {/* Desktop: 3-panel layout */}
        {!isMobile && (
          <>
            {renderSidebar()}
            {children || <ChatArea selectedMaterial={selectedMaterial} />}
            <StudioPanel selectedMaterial={selectedMaterial} />
          </>
        )}

        {/* Mobile: Single panel with tab switching */}
        {isMobile && (
          <div className="w-full">
            {activeTab === 'sources' && renderSidebar()}
            {activeTab === 'chat' && (children || <ChatArea selectedMaterial={selectedMaterial} />)}
            {activeTab === 'studio' && <StudioPanel selectedMaterial={selectedMaterial} />}
          </div>
        )}
      </div>

      {/* Mobile Bottom Tabs */}
      {isMobile && (
        <MobileBottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
}