"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SalesforceCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const code = searchParams.get('code');

    if (user && code) {
      // Here you would typically send the code to your backend to exchange it for an access token
      // and then store the necessary details in Firestore.
      // For this example, we'll simulate storing dummy data.
      
      const storeSalesforceAuth = async () => {
        try {
          const userDocRef = doc(db, "users", user.uid); // Assumes 'users' collection
          await updateDoc(userDocRef, {
            sfdcAuth: {
              // In a real app, these would come from your server after OAuth exchange
              accessToken: `simulated_token_for_code_${code.substring(0, 10)}`,
              instanceUrl: "https://your-instance.salesforce.com",
              connected: true,
            }
          });

          toast({
            title: "Salesforce Connected!",
            description: "Your account has been successfully linked.",
          });

          router.push('/settings');
        } catch (error) {
          console.error("Error updating document: ", error);
          toast({
            variant: "destructive",
            title: "Connection Failed",
            description: "Could not save Salesforce connection details.",
          });
          router.push('/settings');
        }
      };

      storeSalesforceAuth();

    } else {
        if (!user) {
            // Wait for user context to be available
            return;
        }
         toast({
            variant: "destructive",
            title: "Callback Error",
            description: "Invalid callback request. No authorization code found.",
          });
        router.push('/settings');
    }
  }, [user, searchParams, router, toast]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Connecting to Salesforce...</p>
      </div>
    </div>
  );
}
