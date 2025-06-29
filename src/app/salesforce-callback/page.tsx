
"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSalesforceAccessToken } from '../salesforce/actions';

export default function SalesforceCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get('code');

    if (loading) {
        return; // Wait for user/loading state to resolve
    }

    if (user && code) {
      const handleAuth = async () => {
        const result = await getSalesforceAccessToken(code, user.uid);

        if (result.success) {
            toast({
                title: "Salesforce Connected!",
                description: "Your account has been successfully linked.",
            });
            router.push('/settings');
        } else {
            toast({
                variant: "destructive",
                title: "Connection Failed",
                description: result.error || "Could not save Salesforce connection details.",
            });
            router.push('/settings');
        }
      };
      handleAuth();

    } else {
        if (!code) {
             toast({
                variant: "destructive",
                title: "Callback Error",
                description: "Invalid callback request. No authorization code found.",
            });
            router.push('/settings');
        }
    }
  }, [user, loading, searchParams, router, toast]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Connecting to Salesforce...</p>
      </div>
    </div>
  );
}
