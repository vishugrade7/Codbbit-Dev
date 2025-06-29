"use client";

import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { CodeXml, LogOut, Settings, User as UserIcon, Flame } from "lucide-react";
import { signOut } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import NavLink from "./nav-link";

export default function Header() {
  const { user, userData, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  const getUserInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  }

  const baseNavLinks = [
    { href: "/problems/apex", label: "Apex Problems" },
    { href: "/courses", label: "Courses" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  const navLinks = isAdmin ? [...baseNavLinks, { href: "/admin", label: "Upload Problem" }] : baseNavLinks;


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
                <CodeXml className="h-6 w-6 text-primary" />
                <span className="font-headline text-lg font-semibold">Codbbit</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
                {navLinks.map(link => (
                    <NavLink key={link.href} href={link.href} active={pathname.startsWith(link.href)}>
                        {link.label}
                    </NavLink>
                ))}
            </nav>
        </div>
        <div className="flex items-center gap-4">
          {user && userData ? (
            <>
              <div className="flex items-center gap-2 text-amber-400">
                <Flame className="h-5 w-5" />
                <span className="font-bold">{userData.points || 0}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary">
                      <AvatarImage src={userData.avatarUrl || undefined} alt={userData.name || "User"} />
                      <AvatarFallback>{getUserInitials(userData.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userData.name || "User"}</p>
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
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
