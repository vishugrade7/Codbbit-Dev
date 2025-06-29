
"use client";

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSalesforceAccessToken } from '../salesforce/actions';

// This component uses useSearchParams and must be wrapped in a <Suspense> boundary.
function SalesforceCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
       toast({
        variant: "destructive",
        title: "Salesforce Connection Error",
        description: searchParams.get('error_description') || "An unknown error occurred.",
      });
      router.replace('/settings');
      return;
    }
    
    // Wait until the auth state is resolved
    if (loading) {
      return;
    }
    
    // If not logged in, redirect to login
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "You must be logged in to connect to Salesforce.",
      });
      router.replace('/login');
      return;
    }

    // If logged in and we have a code, process it
    if (code) {
      const handleAuth = async () => {
        const codeVerifier = sessionStorage.getItem('sfdc_code_verifier');
        if (!codeVerifier) {
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: "Your session has expired. Please try connecting again.",
          });
          router.replace('/settings');
          return;
        }
        
        // Clean up the verifier from storage
        sessionStorage.removeItem('sfdc_code_verifier');

        const result = await getSalesforceAccessToken(code, codeVerifier, user.uid);

        if (result.success) {
          toast({
            title: "Salesforce Connected!",
            description: "Your account has been successfully linked.",
          });
          router.replace('/settings');
        } else {
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: result.error || "Could not save Salesforce connection details.",
          });
          router.replace('/settings');
        }
      };
      handleAuth();
    } else {
      // If we are logged in but there's no code, it's an error.
      toast({
        variant: "destructive",
        title: "Callback Error",
        description: "Invalid callback request. No authorization code found.",
      });
      router.replace('/settings');
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

// The default export for the page wraps the main component in Suspense
export default function SalesforceCallbackPage() {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading...</p>
            </div>
        </div>
    }>
      <SalesforceCallbackContent />
    </Suspense>
  )
}
