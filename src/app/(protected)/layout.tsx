'use client';

import { MaterialsProvider } from '@/context/MaterialsContext';
import LayoutWrapper from '@/components/dashboard/LayoutWrapper';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MaterialsProvider>
      <LayoutWrapper>{children}</LayoutWrapper>
    </MaterialsProvider>
  );
}