
"use client";

import { useEffect, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSalesforceAccessToken } from '../salesforce/actions';

function SalesforceCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

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
    
    if (loading || !user || !code || isProcessing) {
      return;
    }
    
    setIsProcessing(true);

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
  }, [user, loading, searchParams, router, toast, isProcessing]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Connecting to Salesforce...</p>
      </div>
    </div>
  );
}

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
