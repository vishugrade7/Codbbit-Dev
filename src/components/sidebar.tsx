
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Code, BookOpenCheck, Trophy, ClipboardList, Play, Settings, LogOut, User as UserIcon, UploadCloud, Sun, Moon, Bug, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useTheme } from 'next-themes';
import { useMemo } from 'react';
import { Skeleton } from './ui/skeleton';

const navItems = [
  { href: '/', label: 'Home', icon: Home, animation: 'group-hover:animate-icon-bounce' },
  { href: '/apex-problems', label: 'Practice', icon: Code, animation: 'group-hover:animate-icon-shake' },
  { href: '/courses', label: 'Courses', icon: BookOpenCheck, animation: 'group-hover:animate-icon-flip' },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy, animation: 'group-hover:animate-icon-wiggle' },
  { href: '/problem-sheets', label: 'Sheets', icon: ClipboardList, animation: 'group-hover:animate-icon-shake' },
  { href: '/lwc-playground', label: 'Playground', icon: Play, animation: 'group-hover:animate-icon-pulse' },
];

const adminNavItems = [
  { href: '/upload-problem', label: 'Admin', icon: UploadCloud, animation: 'group-hover:animate-icon-bounce' }
];

const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData, isPro, brandingSettings, loadingBranding } = useAuth();
  const { theme, setTheme } = useTheme();

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
  
  const handleLogout = async () => {
    if (!auth) return;
    await auth.signOut();
    router.push('/');
  };

  const isAuthorizedAdmin = userData?.isAdmin || user?.email === 'gradevishu@gmail.com';
  
  if (!user) {
    return null;
  }

  return (
    <TooltipProvider>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-20 flex-col items-center border-r bg-background/70 backdrop-blur-lg py-4 md:flex">
        <Link href="/" className="mb-4">
          {loadingBranding ? (
            <Skeleton className="h-8 w-8 rounded-lg" />
          ) : (
            <Image src={logoSrc} alt="Codbbit logo" width={32} height={32} />
          )}
        </Link>
        
        <Separator className="w-2/3" />
        
        <nav className="flex flex-col items-center gap-4 py-4">
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-lg group",
                    pathname === item.href && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className={cn("h-5 w-5", item.animation)} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {isAuthorizedAdmin && adminNavItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "rounded-lg group",
                    pathname === item.href && "bg-primary/10 text-primary hover:bg-primary/20"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className={cn("h-5 w-5", item.animation)} />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
        
        <div className="mt-auto flex flex-col items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="rounded-lg group"
              >
                <Link href="/contact?type=bug">
                  <Bug className="h-5 w-5 group-hover:animate-icon-shake group-hover:text-destructive" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Report a Bug</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="rounded-lg group"
              >
                <Link href="/contact">
                  <LifeBuoy className="h-5 w-5 group-hover:animate-icon-pulse" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Support</p>
            </TooltipContent>
          </Tooltip>
          <Separator className="w-2/3" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className='w-12 h-12 rounded-full'>
                    <Avatar className="h-12 w-12 border-2 border-primary/50">
                        <AvatarImage src={userData?.avatarUrl} alt={userData?.name} />
                        <AvatarFallback>{getInitials(userData?.name ?? '')}</AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="center" className="w-56">
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
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sun className="h-4 w-4 mr-2 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute left-2 h-4 w-4 mr-2 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
