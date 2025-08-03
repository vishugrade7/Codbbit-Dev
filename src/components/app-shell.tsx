
'use client';

import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import Header from './header';
import Footer from './footer';
import { Loader2, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

// Helper function to generate a random string for the code verifier
const generateCodeVerifier = () => {
  const an = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  return Array.from(crypto.getRandomValues(new Uint8Array(128)))
    .map((c) => an[c % an.length])
    .join("");
};

// Helper function to generate the code challenge from the verifier
const generateCodeChallenge = async (verifier: string) => {
  const te = new TextEncoder();
  const d = await crypto.subtle.digest("SHA-256", te.encode(verifier));
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(d)]))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const generateState = () => {
    const an = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((c) => an[c % an.length])
        .join("");
}

function SalesforceAuthPrompt() {
  const { promptForSfdcAuth, setPromptForSfdcAuth } = useAuth();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = generateState();

        sessionStorage.setItem('sfdc-code-verifier', codeVerifier);
        sessionStorage.setItem('sfdc-state', state);

        const clientId = process.env.NEXT_PUBLIC_SFDC_CLIENT_ID;
        const redirectUri = `${process.env.NEXT_PUBLIC_HOST}/salesforce-callback`;
        const loginUrl = process.env.SFDC_LOGIN_URL || 'https://login.salesforce.com';

        const authUrl = new URL(`${loginUrl}/services/oauth2/authorize`);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('client_id', clientId!);
        authUrl.searchParams.append('redirect_uri', redirectUri);
        authUrl.searchParams.append('scope', 'api refresh_token');
        authUrl.searchParams.append('code_challenge', codeChallenge);
        authUrl.searchParams.append('code_challenge_method', 'S256');
        authUrl.searchParams.append('state', state);

        window.location.href = authUrl.toString();

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Connection Error",
            description: "Could not initiate Salesforce connection. Please try again.",
        });
        setIsConnecting(false);
    }
  };


  return (
      <Dialog open={promptForSfdcAuth} onOpenChange={setPromptForSfdcAuth}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-6 w-6 text-primary" />
                      Connect to Salesforce
                  </DialogTitle>
                  <DialogDescription className="pt-2">
                     To solve problems and run code on the Codbbit platform, you need to connect to a Salesforce Developer Org. This allows us to safely compile and test your code.
                  </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setPromptForSfdcAuth(false)}>Skip for Now</Button>
                  <Button onClick={handleConnect} disabled={isConnecting}>
                    {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Connect Salesforce
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
  );
}


export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isCallbackPage = pathname === '/salesforce-callback';
  const isProblemWorkspace = pathname.startsWith('/problems/apex/');
  
  // Don't render any layout on auth or callback pages
  if (isAuthPage || isCallbackPage) {
    return <>{children}</>;
  }
  
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Render a unified layout with Header and Footer for all other pages
  return (
    <div className="flex min-h-screen w-full flex-col">
      {!isProblemWorkspace && <Header />}
      <SalesforceAuthPrompt />
      <div className="flex-1 w-full">{children}</div>
      {!user && !isProblemWorkspace && <Footer />}
    </div>
  );
}
