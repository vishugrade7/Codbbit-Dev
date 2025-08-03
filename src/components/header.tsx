
"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, LogOut, User as UserIcon, Settings, UploadCloud, Rocket, Bug, LifeBuoy, Flame } from "lucide-react";
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
import { Skeleton } from "./ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { ThemeToggle } from "./theme-toggle";


export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading: authLoading, isPro, brandingSettings, loadingBranding } = useAuth();
  const { theme } = useTheme();
  
  const [navLinks, setNavLinks] = useState<NavLink[]>([]);
  const [loadingNav, setLoadingNav] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      { href: "/upload-problem", label: "Admin", icon: UploadCloud }
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
        if (isAuthorizedAdmin) {
            return true;
        }
        if (!link.isEnabled) {
            return false;
        }
        if (link.isPro && !isPro) {
            return false;
        }
        return true;
    });
  }, [navLinks, authLoading, loadingNav, isPro, isAuthorizedAdmin]);


  return (
    <header className={cn(
      "sticky top-0 z-30 w-full border-b transition-all duration-300",
      scrolled
        ? "border-border/40 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60"
        : "border-transparent bg-transparent"
    )}>
      <div className="container flex h-12 items-center justify-between">
        <div className="flex items-center gap-2">
             <Link href="/" className="flex items-center gap-2">
              {loadingBranding ? (
                <Skeleton className="h-6 w-6 rounded-lg" />
              ) : (
                <Image src={logoSrc} alt="Codbbit logo" width={24} height={24} />
              )}
              <span className="text-lg font-bold font-headline hidden sm:inline-block">
                {isPro ? "Codbbit Pro" : "Codbbit"}
              </span>
            </Link>
        </div>

        <div className="flex items-center gap-2">
            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="top" className="h-auto max-h-screen w-full overflow-y-auto bg-background/80 backdrop-blur-sm">
                    <div className="grid gap-6 py-6">
                    {user ? (
                        <>
                        <div className="flex flex-col gap-2">
                            <Link href={`/profile/${userData?.username}`} className="flex items-center gap-4 text-left p-2" onClick={() => setIsMobileMenuOpen(false)}>
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
                            </Link>
                            <div className="grid gap-1 text-sm font-medium">
                                {!isPro && (
                                    <Link href="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-primary bg-primary/10 transition-all hover:bg-primary/20">
                                        <Rocket className="h-4 w-4" />
                                        <span>Upgrade</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                        <Separator />
                        </>
                    ) : (
                        <div className="flex flex-col gap-2">
                        <Button asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/login">Login</Link></Button>
                        <Button variant="secondary" asChild onClick={() => setIsMobileMenuOpen(false)}><Link href="/signup">Sign Up</Link></Button>
                        </div>
                    )}
                    <nav className="grid gap-4">
                        {visibleNavLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                            "text-lg font-medium transition-colors hover:text-foreground/80",
                            pathname.startsWith(link.href) ? "text-foreground" : "text-foreground/60",
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
                                pathname.startsWith(link.href) ? "text-foreground" : "text-foreground/60"
                                )}
                            >
                                <link.icon className="h-5 w-5" />
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                    {user && (
                        <>
                        <Separator/>
                        <div className="grid gap-1 text-sm font-medium">
                            <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary">
                                <Settings className="h-4 w-4" /> Settings
                            </Link>
                            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-muted-foreground">
                            <div className="flex items-center gap-3">
                                <ThemeToggle />
                                <span>Theme</span>
                            </div>
                            </div>
                            <Link href="/contact?type=bug" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary">
                                <Bug className="h-4 w-4" /> Report a Bug
                            </Link>
                            <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary">
                                <LifeBuoy className="h-4 w-4" /> Support
                            </Link>
                            <Button variant="destructive" size="sm" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} className="w-full mt-4">
                                <LogOut className="mr-2 h-4 w-4" /> Logout
                            </Button>
                        </div>
                        </>
                    )}
                    </div>
                </SheetContent>
                </Sheet>
            </div>

            {/* Desktop Auth and Theme Toggle */}
            <div className="hidden md:flex items-center gap-2">
              <nav className="flex items-center gap-6 text-sm font-medium">
                {visibleNavLinks.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                        "relative transition-colors text-foreground/60 dark:text-foreground hover:text-foreground",
                        pathname.startsWith(link.href) && "text-foreground"
                    )}
                >
                    {link.label}
                    {pathname.startsWith(link.href) && (
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full"></span>
                    )}
                </Link>
                ))}
                {isAuthorizedAdmin && adminNavLinks.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                    "relative transition-colors text-foreground/60 dark:text-foreground hover:text-foreground",
                    pathname.startsWith(link.href) && "text-foreground"
                    )}
                >
                    {link.label}
                    {pathname.startsWith(link.href) && (
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full"></span>
                    )}
                </Link>
                ))}
              </nav>

              <Separator orientation="vertical" className="h-6 mx-4" />

              {authLoading ? (
                  <div className="flex items-center gap-4">
                      <Skeleton className="h-8 w-16 rounded-md" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
              ) : user ? (
                  <>
                      <ThemeToggle />
                      <Button variant="ghost" className="h-9 px-3 text-sm">
                        <Flame className="h-5 w-5 text-blue-500 mr-2" />
                        <span>{userData?.points?.toLocaleString() ?? 0}</span>
                      </Button>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-secondary hover:bg-secondary/80">
                                  <Avatar className="h-9 w-9">
                                      <AvatarImage src={userData?.avatarUrl} alt={userData?.name} />
                                      <AvatarFallback>{getInitials(userData?.name ?? '')}</AvatarFallback>
                                  </Avatar>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="font-normal">
                                  <div className="flex flex-col space-y-1">
                                  <p className="text-sm font-medium leading-none">{userData?.name}</p>
                                  <p className="text-xs leading-none text-muted-foreground">
                                      {user.email}
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
                              {!isPro && (
                                  <DropdownMenuItem onClick={() => router.push('/pricing')} className="text-primary focus:bg-primary/10 focus:text-primary">
                                      <Rocket className="mr-2 h-4 w-4" />
                                      <span>Upgrade</span>
                                  </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                  <LogOut className="mr-2 h-4 w-4" />
                                  <span>Log out</span>
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </>
              ) : (
                  <>
                      <ThemeToggle />
                      <Button variant="ghost" asChild>
                        <Link href="/login">Login</Link>
                      </Button>
                      <Button asChild>
                        <Link href="/signup">Sign Up</Link>
                      </Button>
                  </>
              )}
            </div>
        </div>
      </div>
    </header>
  );
}
