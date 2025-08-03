
"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import { useMemo } from "react";
import { Skeleton } from "./ui/skeleton";
import { Instagram } from "lucide-react";

const TelegramIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-5 w-5"
    >
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-1.37.2-1.64l16.46-6.1c.88-.33 1.63.24 1.38 1.43l-2.55 12.05c-.27 1.22-1.04 1.51-2.2 1.05l-5.12-3.75-2.4 2.3c-.48.46-1.12.56-1.5.19z"/>
    </svg>
);


export default function Footer() {
  const { theme } = useTheme();
  const { brandingSettings, loadingBranding } = useAuth();

  const logoSrc = useMemo(() => {
    if (!brandingSettings) return "/favicon.ico";
    const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return (isDark ? brandingSettings.logo_dark : brandingSettings.logo_light) || '/favicon.ico';
  }, [brandingSettings, theme]);

  return (
    <footer className="w-full border-t bg-background">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              {loadingBranding ? (
                <Skeleton className="h-6 w-6 rounded-full" />
              ) : (
                <Image src={logoSrc} alt="Codbbit logo" width={24} height={24} />
              )}
              <span className="text-lg font-bold font-headline">Codbbit</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              The ultimate playground for Apex developers to practice, learn, and grow their Salesforce careers.
            </p>
          </div>
          <div className="md:col-span-2">
             <h3 className="font-semibold mb-4">Platform</h3>
             <div className="grid gap-2 text-sm">
                <Link href="/courses" className="text-muted-foreground hover:text-foreground">Courses</Link>
                <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground">Leaderboard</Link>
                <Link href="/apex-problems" className="text-muted-foreground hover:text-foreground">Practice Problems</Link>
             </div>
          </div>
           <div className="md:col-span-2">
             <h3 className="font-semibold mb-4">Company</h3>
              <div className="grid gap-2 text-sm">
                <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
                <Link href="/contact" className="text-muted-foreground hover:text-foreground">Support & Feedback</Link>
              </div>
          </div>
           <div className="md:col-span-2">
             <h3 className="font-semibold mb-4">Legal</h3>
              <div className="grid gap-2 text-sm">
                <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
              </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Codbbit. All rights reserved.
          </p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
             <Link href="https://instagram.com/codbbit" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
             </Link>
             <Link href="https://t.me/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <TelegramIcon />
                <span className="sr-only">Telegram</span>
             </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
