import LayoutWrapper from '@/components/dashboard/LayoutWrapper';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutWrapper>{children}</LayoutWrapper>;
}