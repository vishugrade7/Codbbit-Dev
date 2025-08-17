
"use client";

import Link from "next/link";
import { CodeXml, Menu, LogOut, User as UserIcon, Settings, Rocket, Lightbulb, Shield, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import type { NavLink } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getQuickTipAction } from "@/app/actions";
import { getNavigationSettings } from "@/app/upload-problem/actions";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./theme-toggle";


export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading: authLoading, isPro } = useAuth();
  const { toast } = useToast();
  
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [loadingNav, setLoadingNav] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchNav = async () => {
        setLoadingNav(true);
        const links = await getNavigationSettings();
        setNavLinks(links.filter(link => link.isEnabled));
        setLoadingNav(false);
    }
    fetchNav();
  }, []);
  
  useEffect(() => {
    const showTip = sessionStorage.getItem('showWelcomeTip');
    if (showTip === 'true' && user) {
        sessionStorage.removeItem('showWelcomeTip');
        const fetchAndShowTip = async () => {
            try {
                const { tip } = await getQuickTipAction();
                toast({
                    title: (
                        <div className="flex items-center gap-2">
                            <Lightbulb className="h-5 w-5 text-yellow-400" />
                            <span className="font-semibold">Quick Tip</span>
                        </div>
                    ),
                    description: tip,
                    duration: 9000,
                });
            } catch (error) {
                console.error("Failed to fetch quick tip:", error);
            }
        };
        fetchAndShowTip();
    }
  }, [user, toast]);

  const handleLogout = async () => {
    if (!auth) return;
    await auth.signOut();
    router.push('/');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <CodeXml className="h-6 w-6" />
            <span className="text-lg font-bold font-headline">{isPro ? 'Codbbit Pro' : 'Codbbit'}</span>
          </Link>
        </div>

        <div className="flex-1 flex justify-center">
            <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
                {loadingNav ? (
                    <>
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-28" />
                    </>
                ) : (
                    navLinks.map((link, index) => (
                    <React.Fragment key={link.href}>
                        <Link
                            href={link.href}
                            className={cn(
                            "transition-colors hover:text-foreground/80",
                            pathname === link.href ? "text-foreground" : "text-foreground/60"
                            )}
                        >
                            {link.label}
                        </Link>
                        {index < navLinks.length - 1 && (
                            <span className="text-foreground/30">|</span>
                        )}
                    </React.Fragment>
                    ))
                )}
            </nav>
        </div>

        <div className="flex items-center justify-end gap-4">
          {authLoading ? (
            <div className="flex items-center gap-4">
                <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            </div>
          ) : user ? (
            <>
              {/* Desktop view */}
              <div className="hidden md:flex items-center gap-4">
                 <div className="flex items-center gap-1.5 font-semibold">
                    <Flame className="h-5 w-5 text-primary" />
                    <span>{userData?.points?.toLocaleString() ?? 0}</span>
                </div>
                 <ThemeToggle />
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className='w-9 h-9 rounded-full'>
                            <Avatar className="h-9 w-9 border-2 border-primary/50">
                                <AvatarImage src={userData?.avatarUrl} alt={userData?.name} />
                                <AvatarFallback>{getInitials(userData?.name ?? '')}</AvatarFallback>
                            </Avatar>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{userData?.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user?.email}
                            </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push(`/profile/${userData?.username}`)}>
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/settings')}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </DropdownMenuItem>
                         {userData?.isAdmin && (
                            <DropdownMenuItem onClick={() => router.push('/admin')}>
                                <Shield className="mr-2 h-4 w-4" />
                                <span>Admin</span>
                            </DropdownMenuItem>
                        )}
                        {!isPro && (
                            <DropdownMenuItem onClick={() => router.push('/pricing')}>
                                <Rocket className="mr-2 h-4 w-4" />
                                <span>Upgrade</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile view with Sheet */}
              <div className="flex items-center gap-2 md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <div className="grid gap-6 py-6">
                      <Link href="/" className="flex items-center gap-2 mb-4" onClick={() => setIsMobileMenuOpen(false)}>
                        <CodeXml className="h-6 w-6" />
                        <span className="text-lg font-bold font-headline">{isPro ? 'Codbbit Pro' : 'Codbbit'}</span>
                      </Link>
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <div className="relative flex items-center gap-4 text-left p-2 rounded-lg hover:bg-muted">
                                <Avatar className="h-12 w-12 cursor-pointer">
                                    <AvatarImage src={userData?.avatarUrl} alt={userData?.name ?? ''} />
                                    <AvatarFallback>{getInitials(userData?.name ?? '')}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium leading-none">{userData?.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                    </p>
                                </div>
                            </div>
                          </DropdownMenuTrigger>
                           <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuItem onClick={() => {router.push('/profile'); setIsMobileMenuOpen(false);}}>
                              <UserIcon className="mr-2 h-4 w-4" />
                              <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {router.push('/settings'); setIsMobileMenuOpen(false);}}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                            {!isPro && (
                                <DropdownMenuItem onClick={() => {router.push('/pricing'); setIsMobileMenuOpen(false);}}>
                                    <Rocket className="mr-2 h-4 w-4" />
                                    <span>Upgrade</span>
                                </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      <Separator />
                      <nav className="grid gap-4">
                        {navLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "text-lg font-medium transition-colors hover:text-foreground/80",
                              pathname === link.href ? "text-foreground" : "text-foreground/60"
                            )}
                          >
                            {link.label}
                          </Link>
                        ))}
                         {userData?.isAdmin && (
                            <Link
                                href='/admin'
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                "text-lg font-medium transition-colors hover:text-foreground/80",
                                pathname.startsWith('/admin') ? "text-foreground" : "text-foreground/60"
                                )}
                            >
                                Admin
                            </Link>
                         )}
                      </nav>
                      <div className="absolute bottom-20 left-4 right-4">
                        <ThemeToggle />
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <Button variant="secondary" onClick={() => {handleLogout(); setIsMobileMenuOpen(false);}} className="w-full">
                           <LogOut className="mr-2 h-4 w-4" /> Logout
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Logged-out Buttons */}
              <div className="hidden md:flex items-center gap-2">
                <ThemeToggle />
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>

              {/* Mobile Sheet (triggered by Menu icon) */}
              <div className="md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <div className="grid gap-6 py-6">
                      <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2 mb-4">
                        <CodeXml className="h-6 w-6" />
                        <span className="text-lg font-bold font-headline">Codbbit</span>
                      </Link>
                      <nav className="grid gap-4">
                        {navLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "text-lg font-medium transition-colors hover:text-foreground/80",
                              pathname === link.href ? "text-foreground" : "text-foreground/60"
                            )}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </nav>
                       <div className="absolute bottom-24 left-4 right-4">
                        <ThemeToggle />
                      </div>
                      <div className="flex flex-col gap-4 mt-4 absolute bottom-4 left-4 right-4">
                         <Button variant="ghost" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/login">Login</Link></Button>
                         <Button asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/signup">Sign Up</Link></Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
