import type { Metadata } from 'next';
import '../styles/globals.css';
import AuthProvider from '@/components/auth/PrivyProvider';

export const metadata: Metadata = {
  title: 'ExamChain',
  description: 'Study Smarter. Earn Crypto. Prove It.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0D0D0D] text-[#F5F5F7]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}