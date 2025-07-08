
"use client";

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import { useMemo } from "react";
import { Skeleton } from "./ui/skeleton";

export default function Footer() {
  const { theme } = useTheme();
  const { brandingSettings, loadingBranding } = useAuth();

  const logoSrc = useMemo(() => {
    if (!brandingSettings) return "/favicon.ico";
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return (isDark ? brandingSettings.logo_dark : brandingSettings.logo_light) || '/favicon.ico';
  }, [brandingSettings, theme]);

  return (
    <footer className="w-full py-12 border-t bg-card/50">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              {loadingBranding ? (
                <Skeleton className="h-6 w-6 rounded-full" />
              ) : (
                <Image src={logoSrc} alt="Codbbit logo" width={24} height={24} />
              )}
              <span className="text-lg font-bold font-headline">Codbbit</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              The ultimate playground for Apex developers.
            </p>
          </div>
          <div className="grid gap-2 text-sm">
            <h3 className="font-semibold">Platform</h3>
            <Link href="/courses" className="text-muted-foreground hover:text-foreground">Courses</Link>
            <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground">Leaderboard</Link>
            <Link href="/apex-problems" className="text-muted-foreground hover:text-foreground">Practice Problems</Link>
          </div>
          <div className="grid gap-2 text-sm">
            <h3 className="font-semibold">Community</h3>
            <Link href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">GitHub</Link>
            <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">Twitter</Link>
          </div>
          <div className="grid gap-2 text-sm">
            <h3 className="font-semibold">Company</h3>
            <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground">Support & Feedback</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Codbbit. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
