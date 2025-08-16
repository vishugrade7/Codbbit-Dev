
'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { AdminProvider, AdminDashboard } from '@/components/admin/ProblemManagement';

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
            <main className="flex-1 container py-8">
                <h1 className="text-4xl font-bold">Admin Panel</h1>
                <p className="text-muted-foreground mt-2">
                    Welcome to the admin panel. Manage your application here.
                </p>
                <div className="mt-8">
                    <AdminDashboard />
                </div>
            </main>
        </AdminProvider>
    );
}
