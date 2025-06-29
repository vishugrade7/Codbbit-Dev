
"use client";

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSalesforceConnected, setIsSalesforceConnected] = useState(false);
    const [isCheckingConnection, setIsCheckingConnection] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
        
        if (user) {
            const checkSalesforceConnection = async () => {
                setIsCheckingConnection(true);
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists() && userDoc.data().sfdcAuth?.connected) {
                    setIsSalesforceConnected(true);
                }
                setIsCheckingConnection(false);
            };
            checkSalesforceConnection();
        }

    }, [user, loading, router]);

    const handleSalesforceConnect = () => {
        const clientId = process.env.NEXT_PUBLIC_SFDC_CLIENT_ID;
        if (!clientId || clientId === 'YOUR_SALESFORCE_CLIENT_ID') {
            toast({
                variant: "destructive",
                title: "Configuration Missing",
                description: "Salesforce Client ID is not configured. Please add it to your environment variables.",
            });
            return;
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_HOST}/salesforce-callback`;
        const salesforceAuthUrl = `https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=api%20refresh_token`;
        
        router.push(salesforceAuthUrl);
    };

    const handleSalesforceDisconnect = async () => {
        if (!user) return;
        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                "sfdcAuth": {}
            });
            setIsSalesforceConnected(false);
            toast({
                title: "Salesforce Disconnected",
                description: "Your account has been unlinked.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not disconnect Salesforce account.",
            });
        }
    };
    
    if (loading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            <Header />
            <main className="flex-1">
                <div className="container px-4 md:px-6 py-12 md:py-24 lg:py-32">
                    <div className="mx-auto max-w-2xl">
                        <div className="space-y-2 mb-8">
                            <h1 className="text-3xl font-bold font-headline tracking-tighter sm:text-4xl text-primary">Settings</h1>
                            <p className="text-muted-foreground">Manage your account and app preferences.</p>
                        </div>

                        <div className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Theme</CardTitle>
                                    <CardDescription>Select your preferred color scheme.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between">
                                    <p className="font-medium">Appearance</p>
                                    <ThemeToggle />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Salesforce Integration</CardTitle>
                                    <CardDescription>Connect your Salesforce account to execute code and challenges.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isCheckingConnection ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : isSalesforceConnected ? (
                                        <div className="flex items-center justify-between">
                                            <p className="text-green-400">Successfully connected to Salesforce.</p>
                                            <Button variant="destructive" onClick={handleSalesforceDisconnect}>Disconnect</Button>
                                        </div>
                                    ) : (
                                        <Button onClick={handleSalesforceConnect}>Connect to Salesforce</Button>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
