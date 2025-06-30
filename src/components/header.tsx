
"use client";

import Link from "next/link";
import { CodeXml, Menu, LogOut, User as UserIcon, Settings, UploadCloud, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";


export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  const navLinks = [
    { href: "/apex-problems", label: "Apex Problems" },
    { href: "/courses", label: "Courses" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  const adminNavLinks = [
      { href: "/upload-problem", label: "Upload Problem", icon: UploadCloud }
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <CodeXml className="h-6 w-6" />
            <span className="text-lg font-bold font-headline">Codbbit</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === link.href ? "text-foreground" : "text-foreground/60"
                )}
              >
                {link.label}
              </Link>
            ))}
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
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="flex items-center gap-4">
                <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            </div>
          ) : user ? (
            <>
              {/* Desktop view */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                    <Flame className="h-5 w-5" />
                    <span>{userData?.points?.toLocaleString() ?? 0}</span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={userData?.avatarUrl} alt={userData?.name} />
                        <AvatarFallback>{getInitials(userData?.name ?? '')}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userData?.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile view */}
              <div className="flex items-center gap-2 md:hidden">
                 <div className="flex items-center gap-1.5 font-semibold text-primary">
                    <Flame className="h-5 w-5" />
                    <span>{userData?.points?.toLocaleString() ?? 0}</span>
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userData?.avatarUrl} alt={userData?.name ?? ''} />
                  <AvatarFallback>{getInitials(userData?.name ?? '')}</AvatarFallback>
                </Avatar>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <div className="grid gap-6 py-6">
                      <Link href="/" className="flex items-center gap-2 mb-4">
                        <CodeXml className="h-6 w-6" />
                        <span className="text-lg font-bold font-headline">Codbbit</span>
                      </Link>
                      <nav className="grid gap-4">
                        {navLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                              "text-lg font-medium transition-colors hover:text-foreground/80",
                              pathname === link.href ? "text-foreground" : "text-foreground/60"
                            )}
                          >
                            {link.label}
                          </Link>
                        ))}
                        {isAuthorizedAdmin && adminNavLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
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
                      <div className="flex flex-col gap-4 mt-4">
                         <Button variant="ghost" asChild><Link href="/profile">Profile</Link></Button>
                         <Button variant="ghost" asChild><Link href="/settings">Settings</Link></Button>
                         <Button onClick={handleLogout}>Logout</Button>
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
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>

              {/* Mobile Sheet (triggered by Menu icon) */}
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <div className="grid gap-6 py-6">
                      <Link href="/" className="flex items-center gap-2 mb-4">
                        <CodeXml className="h-6 w-6" />
                        <span className="text-lg font-bold font-headline">Codbbit</span>
                      </Link>
                      <nav className="grid gap-4">
                        {navLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                              "text-lg font-medium transition-colors hover:text-foreground/80",
                              pathname === link.href ? "text-foreground" : "text-foreground/60"
                            )}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </nav>
                      <div className="flex flex-col gap-4 mt-4">
                         <Button variant="ghost" asChild><Link href="/login">Login</Link></Button>
                         <Button asChild><Link href="/signup">Sign Up</Link></Button>
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
