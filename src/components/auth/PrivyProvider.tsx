'use client';
import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const PrivyProviderDynamic = dynamic(
  () => import('@privy-io/react-auth').then((mod) => mod.PrivyProvider),
  { ssr: false }
);

export default function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProviderDynamic
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#00C896',
        },
        embeddedWallets: {
          ethereum: { createOnLogin: 'off' },
          solana: { createOnLogin: 'off' },
        },
      }}
    >
      {children}
    </PrivyProviderDynamic>
  );
}