
"use client";

import type { Metadata } from 'next';
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2, X } from "lucide-react";
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
        currency: currency,
        currencyCode,
      },
      annually: {
        id: 'annually' as const,
        price: prices.annually.price,
        total: prices.annually.total,
        suffix: "/year",
        currency: currency,
        currencyCode,
      },
      free: {
        currency: currency,
      }
    };
  }, [isIndianUser, pricingSettings]);

  const currentPlan = plans?.monthly; // Defaulting to monthly for the new design

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
            color: "#0070F3" // Blue color for Razorpay modal
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
      <main className="flex-1 py-12 flex justify-center items-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </main>
    )
  }

  const freeFeatures = [
    "Up to 3 projects", "5 users", "Kanban & List views", "Real-time collaboration", "Basic integrations"
  ];
  
  const proFeatures = [
    "Unlimited projects", "Kanban & List views", "Time tracking", "File storage (100 GB)", "Advanced integrations (Slack, Google Drive, GitHub)"
  ];
  
  const enterpriseFeatures = [
      "Everything in Pro", "SSO & role-based permissions", "Custom workflows & automation", "Unlimited storage", "SLA & onboarding support"
  ];

  const PricingCard = ({ title, description, price, features, buttonText, buttonVariant = 'default', highlighted = false, onClick, disabled = false }: {
    title: string;
    description: string;
    price: string;
    features: string[];
    buttonText: string;
    buttonVariant?: 'default' | 'outline';
    highlighted?: boolean;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
      <Card className={cn(
        "flex flex-col rounded-xl p-8 bg-white dark:bg-gray-800/50 border dark:border-gray-700 text-gray-800 dark:text-gray-300 relative overflow-hidden",
        highlighted && "border-blue-500/50 dark:bg-gray-900"
      )}>
          {highlighted && (
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none dark:from-blue-900/40" />
          )}
          <CardHeader className="p-0">
              <CardTitle className="text-xl font-medium text-gray-900 dark:text-white">{title}</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">{description}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-grow">
              <div className="my-8">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">{price}</span>
                  {title === 'Pro' && <span className="text-muted-foreground">/month</span>}
              </div>
              <ul className="space-y-4">
                  {features.map(f => <li key={f} className="flex items-center gap-3"><Check className="h-5 w-5 text-gray-500 dark:text-gray-400" /> {f}</li>)}
              </ul>
          </CardContent>
          <CardFooter className="p-0 mt-8">
              <Button 
                onClick={onClick}
                disabled={disabled}
                size="lg" 
                className={cn(
                    'w-full text-base',
                    buttonVariant === 'outline' && "bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200",
                    buttonVariant === 'default' && "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                  {disabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {buttonText}
              </Button>
          </CardFooter>
      </Card>
  );

  return (
    <>
      <title>Pricing Plans</title>
      <main className="flex-1 w-full bg-white dark:bg-black py-12 md:py-24 text-gray-900 dark:text-white">
        <div className="container">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <PricingCard
              title="Basic"
              description="Perfect for individuals or small teams getting started."
              price="$0"
              features={freeFeatures}
              buttonText="Try Now"
              onClick={() => router.push('/signup')}
            />
             <PricingCard
              title="Pro"
              description="Ideal for growing teams that need more power and control."
              price={currentPlan ? `${currentPlan.currency}${currentPlan.price}` : "..."}
              features={proFeatures}
              buttonText="Start 14-Day Free Trial"
              buttonVariant="outline"
              highlighted
              onClick={handleUpgrade}
              disabled={isCheckingOut}
            />
            <PricingCard
              title="Enterprise (Customized)"
              description="For large teams and organizations with advanced needs."
              price="$49,000"
              features={enterpriseFeatures}
              buttonText="Try Now"
              onClick={() => router.push('/contact')}
            />
          </div>
        </div>
      </main>
    </>
  );
}
