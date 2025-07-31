
'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import Header from './header';
import Footer from './footer';
import { Loader2 } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isCallbackPage = pathname === '/salesforce-callback';
  
  // Don't render any layout on auth or callback pages
  if (isAuthPage || isCallbackPage) {
    return <>{children}</>;
  }
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Render a unified layout with Header and Footer for all other pages
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <div className="flex-1 w-full">{children}</div>
      <Footer />
    </div>
  );
}
