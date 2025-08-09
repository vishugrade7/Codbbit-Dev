
'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import Header from './header';
import Footer from './footer';
import Sidebar from './sidebar';
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

  // Render sidebar layout for logged-in users
  if (user) {
    return (
      <div className="relative min-h-screen md:flex">
        <Sidebar />
        {/* Header is now only for mobile navigation in the logged-in state */}
        <Header />
        <div className="w-full md:pl-14">
            {children}
        </div>
      </div>
    );
  }

  // Render public layout for logged-out users
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
