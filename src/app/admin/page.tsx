
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, LayoutDashboard, FileText, BookOpen, Users, Settings, Award, Palette, CreditCard } from 'lucide-react';
import { AdminProvider, AdminDashboard } from '@/components/admin/ProblemManagement';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CodeXml } from 'lucide-react';


const AdminSidebar = () => {
    const pathname = usePathname();
    const navItems = [
        // { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin', label: 'Problems', icon: FileText },
        { href: '/admin/courses', label: 'Courses', icon: BookOpen },
        { href: '/admin/users', label: 'Users', icon: Users },
        { href: '/admin/navigation', label: 'Navigation', icon: Settings },
        { href: '/admin/badges', label: 'Badges', icon: Award },
        { href: '/admin/branding', label: 'Branding', icon: Palette },
        { href: '/admin/pricing', 'label': 'Pricing', icon: CreditCard }
    ];

    // For now, we only have one active page. This logic can be expanded later.
    const currentPath = '/admin';

    return (
        <aside className="w-64 flex-shrink-0 bg-sidebar border-r">
            <div className="h-full flex flex-col">
                <div className="h-16 flex items-center px-6 border-b">
                    <h2 className="text-xl font-bold font-headline">Admin Panel</h2>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-2">
                     {navItems.map((item) => (
                         <Link
                            key={item.label}
                            href={'/admin'} // All links point to /admin for now
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-base font-medium transition-colors",
                                currentPath === item.href
                                ? "bg-primary/10 text-primary"
                                : "text-sidebar-foreground hover:bg-muted"
                            )}
                            // Prevent navigation for disabled items
                            onClick={(e) => { if(item.href !== '/admin') e.preventDefault(); }}
                            aria-disabled={item.href !== '/admin'}
                         >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                         </Link>
                     ))}
                </nav>
            </div>
        </aside>
    );
};


export default function AdminPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !userData?.isAdmin) {
            router.replace('/');
        }
    }, [userData, authLoading, router]);

    if (authLoading || !userData?.isAdmin) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <AdminProvider>
            <div className="flex min-h-screen bg-background">
                <AdminSidebar />
                <div className="flex-1 flex flex-col">
                     <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-6">
                        <div className="flex items-center gap-2">
                           {/* This space can be used for breadcrumbs or page title */}
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <Link href="/apex-problems" className="text-muted-foreground hover:text-foreground">Practice Problems</Link>
                            <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground">Leaderboard</Link>
                            <Link href="/problem-sheets" className="text-muted-foreground hover:text-foreground">Problem Sheets</Link>
                            <Link href="/admin" className="font-semibold text-primary">Admin</Link>
                             <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {userData.name.charAt(0)}
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 p-6">
                         <AdminDashboard />
                    </main>
                </div>
            </div>
        </AdminProvider>
    );
}
