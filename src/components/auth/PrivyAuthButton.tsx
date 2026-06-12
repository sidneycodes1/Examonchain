'use client';

import dynamic from 'next/dynamic';

const PrivyAuthButtonInner = dynamic(
  () => import('./PrivyAuthButtonInner'),
  { ssr: false }
);

export default function PrivyAuthButton() {
  return <PrivyAuthButtonInner />;
}