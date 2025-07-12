
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2, IndianRupee, Sparkles, Gem, Building } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createRazorpayOrder, verifyAndSavePayment, isRazorpayConfigured } from '@/app/razorpay/actions';
import { getPricingSettings } from "@/app/upload-problem/actions";
import type { PricingSettings } from "@/types";
import { cn } from "@/lib/utils";

// Function to load the Razorpay script
const loadRazorpayScript = () => {
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};


export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>("annually");
  const { user, userData } = useAuth();
  const isIndianUser = userData?.country === 'India';
  const { toast } = useToast();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRazorpayReady, setIsRazorpayReady] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);

  useEffect(() => {
    const checkConfig = async () => {
      setLoadingConfig(true);
      const configured = await isRazorpayConfigured();
      setIsRazorpayReady(configured);
      setLoadingConfig(false);
    };
    checkConfig();
  }, []);

  useEffect(() => {
    const fetchPricing = async () => {
        setLoadingPricing(true);
        try {
            const settings = await getPricingSettings();
            if (settings) {
                setPricingSettings(settings);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load pricing information. Please contact support.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch pricing settings.' });
        } finally {
            setLoadingPricing(false);
        }
    };
    fetchPricing();
  }, [toast]);


  const plans = useMemo(() => {
    if (!pricingSettings || !pricingSettings.inr || !pricingSettings.usd) return null;

    const prices = isIndianUser ? pricingSettings.inr : pricingSettings.usd;
    const currency = isIndianUser ? "₹" : "$";
    const currencyCode = isIndianUser ? "INR" : "USD";

    return {
      monthly: {
        id: 'monthly' as const,
        price: prices.monthly.price,
        total: prices.monthly.total,
        suffix: "/month",
        billDesc: "Billed monthly.",
        currency: currency,
        currencyCode,
        save: null,
      },
      annually: {
        id: 'annually' as const,
        price: prices.annually.price,
        total: prices.annually.total,
        suffix: "/year",
        save: "Save 33%",
        currency: currency,
        currencyCode,
      },
      free: {
        currency: currency,
      }
    };
  }, [isIndianUser, pricingSettings]);

  const currentPlan = plans ? plans[billingCycle] : null;

  const handleUpgrade = async () => {
    if (!user || !userData) {
        toast({ variant: 'destructive', title: 'Not Logged In', description: 'Please log in to upgrade your plan.' });
        router.push('/login');
        return;
    }
    if (!isRazorpayReady) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Payment processing is not configured on the server. Please contact the site administrator.' });
        return;
    }
     if (!currentPlan) {
        toast({ variant: 'destructive', title: 'Error', description: 'Pricing plan not loaded.' });
        return;
    }
    
    setIsCheckingOut(true);

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast({ variant: 'destructive', title: 'Payment Error', description: 'Could not load payment script. Please check your connection.' });
      setIsCheckingOut(false);
      return;
    }

    const orderResponse = await createRazorpayOrder(
        currentPlan.id,
        currentPlan.currencyCode,
        user.uid,
    );

    if (orderResponse.error || !orderResponse.orderId) {
        toast({ variant: 'destructive', title: 'Checkout Error', description: orderResponse.error || 'Could not create an order.' });
        setIsCheckingOut(false);
        return;
    }

    const options = {
        key: orderResponse.razorpayKeyId,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: "Codbbit",
        description: "Pro Plan Subscription",
        image: "https://placehold.co/128x128.png",
        order_id: orderResponse.orderId,
        handler: async function (response: any) {
            const verificationResult = await verifyAndSavePayment(
              response,
              user.uid,
              orderResponse.amount,
              currentPlan.currencyCode,
              currentPlan.id
            );
            if (verificationResult.success) {
                toast({ title: 'Payment Successful!', description: 'Welcome to Pro! Your profile is being updated.' });
                router.push('/profile');
            } else {
                 toast({ variant: 'destructive', title: 'Payment Verification Failed', description: verificationResult.error || 'Please contact support.' });
            }
            setIsCheckingOut(false);
        },
        prefill: {
            name: userData.name,
            email: userData.email,
        },
        theme: {
            color: "#1976D2"
        },
        modal: {
            ondismiss: function() {
                setIsCheckingOut(false);
            }
        }
    };

    try {
      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any){
          toast({ variant: 'destructive', title: 'Payment Failed', description: response.error.description });
          setIsCheckingOut(false);
      });
      paymentObject.open();
    } catch(error) {
       toast({ variant: 'destructive', title: 'Payment Error', description: 'Failed to initialize the payment gateway.' });
       setIsCheckingOut(false);
    }
  };


  if (loadingPricing || loadingConfig || !plans) {
    return (
      <main className="flex-1 container py-12 flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    )
  }

  const freeFeatures = [
    "Access to free problems",
    "Access to free courses",
    "Limited AI Assistant",
    "Community support"
  ];

  const proFeatures = [
    "Access to all premium content",
    "Unlimited AI Assistant",
    "Advanced analytics & insights",
    "Build real world projects",
    "Video solutions and hints",
    "Certificate for each course",
    "Invite to Pro community",
    "Priority support",
  ];
  
  const enterpriseFeatures = [
      "Everything in Pro",
      "Customized learning paths",
      "Team management & dashboards",
      "Dedicated account manager",
      "Faculty and Admin dashboard",
      "Priority support",
  ];

  return (
    <main className="flex-1 w-full dark:bg-slate-900 bg-slate-50 py-12 md:py-24">
      <div className="container">
        <div className="text-center mb-12">
          <p className="text-primary font-semibold mb-2">Plans made for you</p>
          <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight dark:text-white">
            Unlock Premium Learning with Codbbit Pro
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <Card className="flex flex-col bg-background rounded-2xl shadow-sm">
            <CardHeader className="p-8">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg"><Sparkles className="h-6 w-6 text-green-500"/></div>
                  <div>
                      <CardTitle className="text-xl">Free Plan</CardTitle>
                      <CardDescription>Limited Access</CardDescription>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6 flex-grow">
              <Button variant="outline" className="w-full text-lg py-6" disabled>Start now</Button>
              <div className="space-y-3 pt-4">
                  <h4 className="font-semibold">What's included</h4>
                  <ul className="space-y-3 text-muted-foreground">
                      {freeFeatures.map(f => <li key={f} className="flex items-center gap-3"><Check className="h-5 w-5 text-green-500" /> {f}</li>)}
                  </ul>
              </div>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="flex flex-col bg-background rounded-2xl shadow-lg border-2 border-primary/50 relative">
            <div className="absolute top-8 right-8 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold">Most Popular</div>
            <CardHeader className="p-8">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg"><Gem className="h-6 w-6 text-yellow-500"/></div>
                    <div>
                        <CardTitle className="text-xl">Pro Plan</CardTitle>
                        <CardDescription>All courses + AI Mentor</CardDescription>
                    </div>
                </div>
              </div>
              <div className="pt-4">
                <div className="bg-muted p-1 rounded-full flex text-sm w-fit">
                  <button onClick={() => setBillingCycle('monthly')} className={cn("px-4 py-1.5 rounded-full transition-colors font-semibold", billingCycle === 'monthly' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Monthly</button>
                  <button onClick={() => setBillingCycle('annually')} className={cn("px-4 py-1.5 rounded-full transition-colors font-semibold", billingCycle === 'annually' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Yearly</button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6 flex-grow">
               <div className="text-5xl font-bold dark:text-white">{currentPlan.currency}{currentPlan.price}<span className="text-lg font-normal text-muted-foreground">{currentPlan.suffix}</span></div>
              <Button className="w-full text-lg py-6" onClick={handleUpgrade} disabled={isCheckingOut}>
                  {isCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start today
              </Button>
               <div className="space-y-3 pt-4">
                  <h4 className="font-semibold">What's included</h4>
                  <ul className="space-y-3 text-muted-foreground">
                      {proFeatures.map(f => <li key={f} className="flex items-center gap-3"><Check className="h-5 w-5 text-green-500" /> {f}</li>)}
                  </ul>
              </div>
            </CardContent>
          </Card>

          {/* Enterprise Plan */}
          <Card className="flex flex-col bg-background rounded-2xl shadow-sm">
            <CardHeader className="p-8">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"><Building className="h-6 w-6 text-blue-500"/></div>
                  <div>
                      <CardTitle className="text-xl">Enterprise Plan</CardTitle>
                      <CardDescription>For Colleges & Universities</CardDescription>
                  </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6 flex-grow">
               <Button variant="outline" className="w-full text-lg py-6" onClick={() => router.push('/contact')}>Contact us</Button>
                <div className="space-y-3 pt-4">
                  <h4 className="font-semibold">What's included</h4>
                  <ul className="space-y-3 text-muted-foreground">
                      {enterpriseFeatures.map(f => <li key={f} className="flex items-center gap-3"><Check className="h-5 w-5 text-green-500" /> {f}</li>)}
                  </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
