
"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, LogOut, User as UserIcon, Settings, UploadCloud, Flame, Rocket, Bug, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import type { NavLink } from "@/types";
import { getPublicNavigationLinks } from "@/app/upload-problem/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";


export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading: authLoading, isPro, brandingSettings, loadingBranding } = useAuth();
  const { theme } = useTheme();
  
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [loadingNav, setLoadingNav] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const logoSrc = useMemo(() => {
    if (!brandingSettings) return "/favicon.ico";
    const isDark = theme === 'dark';
    if (isPro) {
        if (isDark) {
            return brandingSettings.logo_pro_dark || brandingSettings.logo_pro_light || brandingSettings.logo_dark || brandingSettings.logo_light || '/favicon.ico';
        }
        return brandingSettings.logo_pro_light || brandingSettings.logo_light || '/favicon.ico';
    }
    
    if (isDark) {
        return brandingSettings.logo_dark || brandingSettings.logo_light || '/favicon.ico';
    }
    return brandingSettings.logo_light || '/favicon.ico';
  }, [brandingSettings, isPro, theme]);


  useEffect(() => {
    const fetchNavLinks = async () => {
      setLoadingNav(true);
      const links = await getPublicNavigationLinks();
      setNavLinks(links);
      setLoadingNav(false);
    };
    fetchNavLinks();
  }, []);
  
  const adminNavLinks = [
      { href: "/upload-problem", label: "Admin Page", icon: UploadCloud }
  ]

  const handleLogout = async () => {
    if (!auth) return;
    await auth.signOut();
    router.push('/');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isAuthorizedAdmin = userData?.isAdmin || user?.email === 'gradevishu@gmail.com';

  const visibleNavLinks = useMemo(() => {
    if (authLoading || loadingNav) return [];
    
    return navLinks.filter(link => {
        // Admins can see all links
        if (isAuthorizedAdmin) {
            return true;
        }

        // For regular users, the link must be enabled
        if (!link.isEnabled) {
            return false;
        }
        
        // Hide pro links from non-pro users
        if (link.isPro && !isPro) {
            return false;
        }

        return true;
    });
  }, [navLinks, authLoading, loadingNav, isPro, isAuthorizedAdmin]);


  return (
    <header className={cn("sticky top-0 z-30 w-full border-b border-border/40 bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60", user && "md:hidden")}>
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            {loadingBranding ? (
              <Skeleton className="h-6 w-6 rounded-full" />
            ) : (
              <Image src={logoSrc} alt="Codbbit logo" width={24} height={24} />
            )}
            <span className="text-lg font-bold font-headline">{isPro ? 'Codbbit' : 'Codbbit'}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
             {(loadingNav || authLoading) ? (
                <>
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-28" />
                </>
            ) : (
                visibleNavLinks.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                    "transition-colors hover:text-foreground/80",
                    pathname === link.href ? "text-foreground" : "text-foreground/60",
                    !link.isEnabled && "text-muted-foreground/50 cursor-not-allowed"
                    )}
                >
                    {link.label}
                </Link>
                ))
            )}
            {user && isAuthorizedAdmin && adminNavLinks.map((link) => (
                 <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                    "transition-colors hover:text-foreground/80 flex items-center gap-1",
                    pathname === link.href ? "text-foreground" : "text-foreground/60"
                    )}
                >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {authLoading ? (
            <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          ) : user ? (
            <div className="flex items-center gap-2">
                 <div className="hidden sm:flex items-center gap-1.5 font-semibold">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <span>{userData?.points?.toLocaleString() ?? 0}</span>
                </div>
            </div>
          ) : (
            <>
              {/* Desktop Logged-out Buttons */}
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            </>
          )}

           {/* Mobile Menu Trigger & Buttons */}
          <div className={cn("flex items-center gap-2", user ? "md:hidden" : "md:hidden")}>
            {!user && !authLoading && (
                <>
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/login" aria-label="Login">
                           <UserIcon className="h-5 w-5" />
                        </Link>
                    </Button>
                     <Button asChild size="sm">
                        <Link href="/signup">Try for Free</Link>
                    </Button>
                </>
            )}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="bg-background/80 backdrop-blur-sm">
                <div className="grid gap-6 py-6">
                  <Link href="/" className="flex items-center gap-2 mb-4" onClick={() => setIsMobileMenuOpen(false)}>
                    {loadingBranding ? (
                      <Skeleton className="h-6 w-6 rounded-full" />
                    ) : (
                      <Image src={logoSrc} alt="Codbbit logo" width={24} height={24} />
                    )}
                    <span className="text-lg font-bold font-headline">{isPro ? 'Codbbit Pro' : 'Codbbit'}</span>
                  </Link>
                  {user && (
                    <>
                       <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4 text-left p-2">
                            <Avatar className="h-12 w-12">
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
                        <div className="grid gap-1 text-sm font-medium">
                            <Link href={`/profile/${userData?.username}`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary">
                              <UserIcon className="h-4 w-4" /> Profile
                            </Link>
                            <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary">
                                <Settings className="h-4 w-4" /> Settings
                            </Link>
                            {!isPro && (
                                <Link href="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary bg-primary/10 transition-all hover:bg-primary/20">
                                    <Rocket className="h-4 w-4" />
                                    <span>Upgrade</span>
                                </Link>
                            )}
                            <Separator className="my-2" />
                            <Link href="/contact?type=bug" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary">
                                <Bug className="h-4 w-4" /> Report a Bug
                            </Link>
                             <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary">
                                <LifeBuoy className="h-4 w-4" /> Support
                            </Link>
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  <nav className="grid gap-4">
                    {visibleNavLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "text-lg font-medium transition-colors hover:text-foreground/80",
                          pathname === link.href ? "text-foreground" : "text-foreground/60",
                          !link.isEnabled && "text-muted-foreground/50 cursor-not-allowed"
                        )}
                      >
                        {link.label}
                      </Link>
                    ))}
                    {isAuthorizedAdmin && user && adminNavLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                            "text-lg font-medium transition-colors hover:text-foreground/80 flex items-center gap-2",
                            pathname === link.href ? "text-foreground" : "text-foreground/60"
                            )}
                        >
                            <link.icon className="h-5 w-5" />
                            {link.label}
                        </Link>
                    ))}
                  </nav>
                  <div className="absolute bottom-4 left-4 right-4">
                    {user ? (
                      <Button variant="secondary" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full">
                         <LogOut className="mr-2 h-4 w-4" /> Logout
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-4">
                         <Button variant="ghost" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/login">Login</Link></Button>
                         <Button asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/signup">Sign Up</Link></Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
           </div>
        </div>
      </div>
    </header>
  );
}
