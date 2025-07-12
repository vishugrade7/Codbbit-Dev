
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2, IndianRupee, Ticket, Sparkles, Gem, Building } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createRazorpayOrder, verifyAndSavePayment, isRazorpayConfigured } from '@/app/razorpay/actions';
import { getPricingSettings } from "@/app/upload-problem/actions";
import type { PricingSettings } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const [voucherCode, setVoucherCode] = useState('');

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
        voucherCode.trim()
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
              currentPlan.id,
              voucherCode.trim() || null
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
    "Community support"
  ];

  const proFeatures = [
    "Everything in Free, plus:",
    "Access to all premium problems",
    "Access to all premium courses",
    "Advanced analytics & insights",
    "Priority support",
    "Certificate for each course"
  ];
  
  const enterpriseFeatures = [
      "Everything in Pro",
      "Customized learning paths",
      "Team management & dashboards",
      "Dedicated account manager",
  ];

  return (
    <main className="flex-1 container py-12">
      <div className="text-center mb-12">
        <p className="text-primary font-semibold mb-2">Plans made for you</p>
        <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight">
          Unlock Premium Learning with Codbbit Pro
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Free Plan */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg"><Sparkles className="h-6 w-6 text-green-500"/></div>
                <div>
                    <CardTitle>Free Plan</CardTitle>
                    <CardDescription>Limited Access</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-grow">
            <Button variant="outline" className="w-full" disabled>Start now</Button>
            <div className="space-y-3 pt-4">
                <h4 className="font-semibold">What's included</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {freeFeatures.map(f => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {f}</li>)}
                </ul>
            </div>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-primary shadow-2xl flex flex-col relative">
          <div className="absolute -top-3 right-6 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-semibold">Most Popular</div>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg"><Gem className="h-6 w-6 text-yellow-500"/></div>
                  <div>
                      <CardTitle>Pro Plan</CardTitle>
                      <CardDescription>All courses + AI Mentor</CardDescription>
                  </div>
              </div>
              <div className="bg-muted p-1 rounded-full flex text-sm">
                <button onClick={() => setBillingCycle('monthly')} className={cn("px-3 py-1 rounded-full transition-colors", billingCycle === 'monthly' ? "bg-background shadow-sm text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}>Monthly</button>
                <button onClick={() => setBillingCycle('annually')} className={cn("px-3 py-1 rounded-full transition-colors", billingCycle === 'annually' ? "bg-background shadow-sm text-primary font-semibold" : "text-muted-foreground hover:text-foreground")}>Yearly</button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-grow">
             <div className="text-4xl font-bold">{currentPlan.currency}{currentPlan.price}<span className="text-lg font-normal text-muted-foreground">{currentPlan.suffix}</span></div>
            <Button className="w-full" onClick={handleUpgrade} disabled={isCheckingOut}>
                {isCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start today
            </Button>
             <div className="space-y-3 pt-4">
                <h4 className="font-semibold">What's included</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {proFeatures.map(f => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {f}</li>)}
                </ul>
            </div>
          </CardContent>
        </Card>

        {/* Enterprise Plan */}
        <Card className="flex flex-col">
          <CardHeader>
             <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg"><Building className="h-6 w-6 text-blue-500"/></div>
                <div>
                    <CardTitle>Enterprise Plan</CardTitle>
                    <CardDescription>For Colleges & Universities</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-grow">
             <Button variant="outline" className="w-full" onClick={() => router.push('/contact')}>Contact us</Button>
              <div className="space-y-3 pt-4">
                <h4 className="font-semibold">What's included</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    {enterpriseFeatures.map(f => <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> {f}</li>)}
                </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
