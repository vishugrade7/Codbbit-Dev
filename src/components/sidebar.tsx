
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CodeXml, Home, Code, BookOpenCheck, Trophy, ClipboardList, Play, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/apex-problems', label: 'Practice', icon: Code },
  { href: '/courses', label: 'Courses', icon: BookOpenCheck },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/problem-sheets', label: 'Sheets', icon: ClipboardList },
  { href: '/lwc-playground', label: 'Playground', icon: Play },
];

const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData } = useAuth();
  
  const handleLogout = async () => {
    if (!auth) return;
    await auth.signOut();
    router.push('/');
  };
  
  if (!user) {
    return null;
  }

  return (
    <TooltipProvider>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-20 flex-col items-center border-r bg-background py-4 md:flex">
        <Link href="/" className="mb-4">
          <CodeXml className="h-8 w-8 text-primary" />
        </Link>
        
        <Separator className="w-2/3" />
        
        <nav className="flex flex-col items-center gap-4 py-4">
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  size="icon"
                  className="rounded-lg"
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
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
