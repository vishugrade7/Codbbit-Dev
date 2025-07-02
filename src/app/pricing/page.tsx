
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createRazorpayOrder, verifyAndSavePayment, isRazorpayConfigured } from '@/app/razorpay/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [billingCycle, setBillingCycle] = useState("monthly");
  const { user, userData } = useAuth();
  const isIndianUser = userData?.country === 'India';
  const { toast } = useToast();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRazorpayReady, setIsRazorpayReady] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    const checkConfig = async () => {
      setLoadingConfig(true);
      const configured = await isRazorpayConfigured();
      setIsRazorpayReady(configured);
      setLoadingConfig(false);
    };
    checkConfig();
  }, []);


  const plans = useMemo(() => {
    const priceData = {
        inr: {
            monthly: { price: 499, total: 499 },
            biannually: { price: 415, total: 2490 },
            annually: { price: 333, total: 3996 },
        },
        usd: {
            monthly: { price: 12, total: 12 },
            biannually: { price: 10, total: 60 },
            annually: { price: 8, total: 96 },
        }
    };

    const currency = isIndianUser ? "₹" : "$";
    const currencyCode = isIndianUser ? "INR" : "USD";
    const prices = isIndianUser ? priceData.inr : priceData.usd;

    return {
      monthly: {
        price: prices.monthly.price,
        total: prices.monthly.total,
        suffix: "/month",
        billDesc: "Billed monthly.",
        currency: currency,
        currencyCode,
        save: null,
      },
      biannually: {
        price: prices.biannually.price,
        total: prices.biannually.total,
        suffix: "/month",
        billDesc: `Billed ${currency}${prices.biannually.total} every 6 months.`,
        save: "16%",
        currency: currency,
        currencyCode,
      },
      annually: {
        price: prices.annually.price,
        total: prices.annually.total,
        suffix: "/month",
        billDesc: `Billed ${currency}${prices.annually.total} annually.`,
        save: "33%",
        currency: currency,
        currencyCode,
      },
      free: {
        currency: currency,
      }
    };
  }, [isIndianUser]);

  const currentPlan = plans[billingCycle as keyof Omit<typeof plans, 'free'>];
  const freePlan = plans.free;

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
    
    setIsCheckingOut(true);

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast({ variant: 'destructive', title: 'Payment Error', description: 'Could not load payment script. Please check your connection.' });
      setIsCheckingOut(false);
      return;
    }

    const orderResponse = await createRazorpayOrder(currentPlan.total, currentPlan.currencyCode);

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
        image: "https://placehold.co/128x128.png", // You should have a logo in your public folder
        order_id: orderResponse.orderId,
        handler: async function (response: any) {
            const verificationResult = await verifyAndSavePayment(response, user.uid);
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
            color: "#1976D2" // A blue shade similar to your primary color
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


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Unlock your full potential with our premium features. Get unlimited access to all problems, advanced analytics, and more.
          </p>
        </div>

        <div className="flex justify-center mb-10">
            <Tabs value={billingCycle} onValueChange={setBillingCycle} className="w-auto">
                <TabsList>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="biannually">6 Months</TabsTrigger>
                    <TabsTrigger value="annually">Yearly</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>For individuals starting their Salesforce journey.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">{freePlan.currency}0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Access to free problems</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Basic profile stats</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Community support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>Your Current Plan</Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className="border-primary shadow-lg relative">
             <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                 <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                    Most Popular
                    {currentPlan.save && <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs">Save {currentPlan.save}</span>}
                 </div>
             </div>
            <CardHeader className="pt-8">
              <CardTitle>Pro</CardTitle>
              <CardDescription>For professionals aiming to master their skills.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col">
                <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{currentPlan.currency}{currentPlan.price}</span>
                    <span className="text-lg font-normal text-muted-foreground">{currentPlan.suffix}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{currentPlan.billDesc}</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Everything in Free</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Access to all premium problems</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Advanced analytics & insights</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
              </ul>
            </CardContent>
            <CardFooter>
              {!isRazorpayReady && !loadingConfig ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full" tabIndex={0}>
                        <Button className="w-full" disabled>
                          Upgrade to Pro
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Payment processing is not available.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button className="w-full" onClick={handleUpgrade} disabled={isCheckingOut || loadingConfig}>
                  {(isCheckingOut || loadingConfig) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loadingConfig ? 'Initializing...' : 'Upgrade to Pro'}
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Enterprise Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
              <CardDescription>For teams and organizations seeking success.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="text-4xl font-bold">Contact Us</div>
               <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Everything in Pro</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Team management & dashboards</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Custom problem sets</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Dedicated account manager</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Contact Sales</Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
