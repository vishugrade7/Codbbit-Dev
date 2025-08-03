
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getSalesforceAccessToken } from '@/app/salesforce/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

function SalesforceCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const processAuth = async () => {
      if (loading) {
        // Auth state is not yet determined, wait.
        return;
      }

      // After loading is false, check for user.
      if (!user) {
        setMessage('Error: User not logged in.');
        toast({ variant: 'destructive', title: 'Authentication Failed', description: 'You must be logged in to connect a Salesforce account.' });
        router.push('/login');
        return;
      }
      
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const storedState = sessionStorage.getItem('sfdc-state');
      const codeVerifier = sessionStorage.getItem('sfdc-code-verifier');
      
      if (state !== storedState) {
        setMessage('Error: Invalid state parameter. Possible CSRF attack.');
        toast({ variant: 'destructive', title: 'Authentication Failed', description: 'State mismatch. Please try connecting again.' });
        router.push('/settings');
        return;
      }
      
      sessionStorage.removeItem('sfdc-state');

      if (!code) {
        setMessage('Error: Authorization code not found.');
        toast({ variant: 'destructive', title: 'Authentication Failed', description: 'Authorization code was missing from the Salesforce response.' });
        router.push('/settings');
        return;
      }
      if (!codeVerifier) {
        setMessage('Error: Code verifier not found.');
        toast({ variant: 'destructive', title: 'Authentication Failed', description: 'Your session may have expired. Please try connecting again.' });
        router.push('/settings');
        return;
      }

      const result = await getSalesforceAccessToken(code, codeVerifier, user.uid);
      
      sessionStorage.removeItem('sfdc-code-verifier');

      if (result.success) {
        setMessage('Successfully connected to Salesforce! Redirecting...');
        toast({ title: 'Connection Successful', description: 'Your Salesforce account has been connected.' });
        router.push('/settings');
      } else {
        setMessage(`Error: ${result.error}`);
        toast({ variant: 'destructive', title: 'Connection Failed', description: result.error });
        router.push('/settings');
      }
    };

    processAuth();
  }, [router, searchParams, user, toast, loading]);

  if(loading){
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h1 className="text-2xl font-bold">Authenticating</h1>
            <p className="text-muted-foreground mt-2">Please wait...</p>
        </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h1 className="text-2xl font-bold">Connecting to Salesforce</h1>
      <p className="text-muted-foreground mt-2">{message}</p>
    </div>
  );
}


export default function SalesforceCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SalesforceCallbackContent />
        </Suspense>
    )
}
