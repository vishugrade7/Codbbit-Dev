
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cancelSubscription } from '@/app/razorpay/actions';

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

export default function Settings() {
  const { user, userData, loading, isPro } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);

        sessionStorage.setItem('sfdc-code-verifier', codeVerifier);

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

  const handleCancelSubscription = async () => {
    if (!user) return;
    setIsCancelling(true);
    const result = await cancelSubscription(user.uid);
    if (result.success) {
      toast({ title: 'Subscription Cancelled', description: 'Your Pro access has been removed.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsCancelling(false);
  };
  
  if (loading) {
    return (
      <main className="flex-1 container py-8 flex justify-center items-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="flex-1 container py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and app settings.</p>

        <div className="mt-8 space-y-8">

          <Card>
              <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>
                  {isPro
                      ? "Manage your subscription details."
                      : "Upgrade to unlock premium features."}
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div>
                          <p className="font-semibold">{isPro ? "Pro Plan" : "Free Plan"}</p>
                          <p className="text-sm text-muted-foreground">
                          {isPro && userData?.subscriptionEndDate
                              ? `Your plan renews on ${format(userData.subscriptionEndDate.toDate(), "PPP")}.`
                              : "Access to free problems and core features."}
                          </p>
                      </div>
                      {isPro ? (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline">Manage Plan</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. You will immediately lose access to all Pro features and your plan will not auto-renew.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelSubscription} disabled={isCancelling}>
                                  {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Cancel Subscription
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      ) : (
                         <Button asChild>
                            <Link href="/pricing">Upgrade</Link>
                         </Button>
                      )}
                  </div>
              </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between gap-4">
                 <div className="flex flex-col flex-1 min-w-0">
                    <Label>Salesforce Connection</Label>
                    <p className="text-sm text-muted-foreground truncate">
                      {userData?.sfdcAuth?.connected 
                        ? `Connected to: ${userData.sfdcAuth.instanceUrl}`
                        : "Connect your Salesforce org to run code."
                      }
                    </p>
                 </div>
                  <Button variant="outline" onClick={handleConnect} disabled={isConnecting} className="shrink-0">
                     {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     {userData?.sfdcAuth?.connected ? "Reconnect" : "Connect"}
                  </Button>
               </div>
               <div className="flex items-center justify-between">
                 <div className="flex flex-col">
                    <Label className="text-destructive">Delete Account</Label>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                 </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="destructive">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => toast({ title: "Action not implemented."})}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
               </div>
            </CardContent>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="theme">Theme</Label>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </main>
  );
}
