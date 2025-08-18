

"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2, Tag, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createRazorpayOrder, verifyAndSavePayment, isRazorpayConfigured } from '@/app/razorpay/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PricingPlan } from "@/types";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'biannually' | 'annually'>("monthly");
  const { user, userData } = useAuth();
  const isIndianUser = userData?.country === 'India';
  const { toast } = useToast();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRazorpayReady, setIsRazorpayReady] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [allPlans, setAllPlans] = useState<any>(null); // Will hold the single pricing document data
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{code: string; type: 'percentage' | 'fixed'; value: number} | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);


  useEffect(() => {
    const checkConfig = async () => {
      setLoadingConfig(true);
      const configured = await isRazorpayConfigured();
      setIsRazorpayReady(configured);
      setLoadingConfig(false);
    };
    checkConfig();

    const fetchPlans = async () => {
        if (!db) return;
        setLoadingPlans(true);
        try {
            const pricingDocRef = doc(db, 'settings', 'pricing');
            const docSnap = await getDoc(pricingDocRef);
            if (docSnap.exists()) {
                setAllPlans(docSnap.data());
            } else {
                 toast({ variant: 'destructive', title: 'Pricing plans not configured.' });
            }
        } catch (error) {
            console.error("Failed to fetch pricing plans:", error);
            toast({ variant: 'destructive', title: 'Could not load pricing plans.' });
        }
        setLoadingPlans(false);
    }
    fetchPlans();
  }, [toast]);

  const getPlanDetails = (planId: 'monthly' | 'biannually' | 'annually') => {
        if (!allPlans) return null;
        
        const currency = isIndianUser ? 'inr' : 'usd';
        const currencySymbol = isIndianUser ? '₹' : '$';
        
        const planData = allPlans[currency]?.[planId];
        if (!planData) return null;

        return {
            id: planId,
            price: planData.price,
            total: planData.total,
            currency: currencySymbol,
            currencyCode: currency.toUpperCase() as 'INR' | 'USD',
            // Hardcoded features for now, can be moved to DB later
            features: [
                { value: 'Access to all premium problems' },
                { value: 'Detailed submission analytics' },
                { value: 'Create unlimited problem sheets' },
            ]
        };
    };

    const monthlyPlan = getPlanDetails('monthly');
    const biannualPlan = getPlanDetails('biannually');
    const annualPlan = getPlanDetails('annually');

  const selectedPlan = useMemo(() => {
      switch (billingCycle) {
          case 'annually': return annualPlan;
          case 'biannually': return biannualPlan;
          default: return monthlyPlan;
      }
  }, [billingCycle, annualPlan, biannualPlan, monthlyPlan]);

  const discountedTotal = useMemo(() => {
    if (!appliedVoucher || !selectedPlan) {
        return selectedPlan?.total;
    }
    if (appliedVoucher.type === 'percentage') {
        const discount = (selectedPlan.total * appliedVoucher.value) / 100;
        return selectedPlan.total - discount;
    }
    if (appliedVoucher.type === 'fixed') {
        return Math.max(0, selectedPlan.total - appliedVoucher.value);
    }
    return selectedPlan.total;
  }, [appliedVoucher, selectedPlan]);

  useEffect(() => {
    // Reset voucher when billing cycle changes
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError(null);
  }, [billingCycle]);


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
     if (!selectedPlan || discountedTotal === undefined) {
        toast({ variant: 'destructive', title: 'Plan not available', description: 'The selected billing cycle is not available.' });
        return;
    }
    
    setIsCheckingOut(true);

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      toast({ variant: 'destructive', title: 'Payment Error', description: 'Could not load payment script. Please check your connection.' });
      setIsCheckingOut(false);
      return;
    }

    const orderResponse = await createRazorpayOrder(discountedTotal, selectedPlan.currencyCode);

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
              discountedTotal! * 100, // Pass amount in subunits
              selectedPlan.currencyCode,
              selectedPlan.id as 'monthly' | 'biannually' | 'annually'
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

  const getBillingDescription = (plan: ReturnType<typeof getPlanDetails>) => {
      if (!plan) return '';
      switch(plan.id) {
          case 'monthly': return 'Billed monthly.';
          case 'biannually': return `Billed ${plan.currency}${(plan.total).toLocaleString()} every 6 months.`;
          case 'annually': return `Billed ${plan.currency}${(plan.total).toLocaleString()} annually.`;
          default: return '';
      }
  };

  const getSavings = (plan: ReturnType<typeof getPlanDetails>) => {
      if (!plan || !monthlyPlan || plan.id === 'monthly') return null;
      const monthlyTotal = monthlyPlan.price * (plan.id === 'annually' ? 12 : 6);
      const savings = 100 - (plan.total / monthlyTotal * 100);
      return Math.round(savings);
  }

  const handleApplyVoucher = () => {
    setVoucherError(null);
    setAppliedVoucher(null);
    if (!voucherCode) {
        setVoucherError('Please enter a voucher code.');
        return;
    }
    const availableVouchers = allPlans?.vouchers || [];
    const voucher = availableVouchers.find((v: any) => v.code.toLowerCase() === voucherCode.toLowerCase());

    if (!voucher) {
        setVoucherError('This voucher code is not valid.');
        return;
    }

    if (voucher.status !== 'active') {
        setVoucherError('This voucher is no longer active.');
        return;
    }

    if (voucher.expiresAt && new Date() > voucher.expiresAt.toDate()) {
        setVoucherError('This voucher has expired.');
        return;
    }

    setAppliedVoucher({ code: voucher.code, type: voucher.type, value: voucher.value });
    toast({ title: 'Voucher applied successfully!' });
  };
  
  const removeVoucher = () => {
    setVoucherCode('');
    setAppliedVoucher(null);
    setVoucherError(null);
  }


  if (loadingPlans) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
  }


  return (
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
          <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as any)}>
            <TabsList>
              {monthlyPlan && <TabsTrigger value="monthly">Monthly</TabsTrigger>}
              {biannualPlan && <TabsTrigger value="biannually">6 Months</TabsTrigger>}
              {annualPlan && <TabsTrigger value="annually">Yearly</TabsTrigger>}
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
            <div className="text-4xl font-bold">{isIndianUser ? '₹' : '$'}0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
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
            {selectedPlan && (
                <>
                <div className="absolute top-0 -translate-y-1/2 w-full flex justify-center">
                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                        Most Popular
                        {getSavings(selectedPlan) && <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-xs">Save {getSavings(selectedPlan)}%</span>}
                    </div>
                </div>
                <CardHeader className="pt-8">
                    <CardTitle>Pro</CardTitle>
                    <CardDescription>For professionals aiming to master their skills.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                            {appliedVoucher && (
                                <span className="text-2xl font-bold text-muted-foreground line-through">{selectedPlan.currency}{selectedPlan.price}</span>
                            )}
                            <span className="text-4xl font-bold">{selectedPlan.currency}{appliedVoucher ? (discountedTotal! / (billingCycle === 'annually' ? 12 : billingCycle === 'biannually' ? 6 : 1)).toFixed(2) : selectedPlan.price}</span>
                            <span className="text-lg font-normal text-muted-foreground">/month</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{getBillingDescription(selectedPlan)}</p>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Everything in Free</li>
                         {selectedPlan.features.map(feature => (
                            <li key={feature.value} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {feature.value}</li>
                        ))}
                    </ul>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="voucher">Have a voucher code?</Label>
                        {appliedVoucher ? (
                            <div className="flex items-center justify-between p-2 rounded-md bg-green-500/10 border border-green-500/20">
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">Voucher <span className="font-mono">`{appliedVoucher.code}`</span> applied!</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-700 dark:text-green-300" onClick={removeVoucher}><X className="h-4 w-4"/></Button>
                            </div>
                        ) : (
                             <>
                             <div className="flex gap-2">
                                <Input id="voucher" placeholder="Enter code" value={voucherCode} onChange={e => setVoucherCode(e.target.value)} disabled={!!appliedVoucher} />
                                <Button variant="outline" onClick={handleApplyVoucher} disabled={!voucherCode}>Apply</Button>
                            </div>
                            {voucherError && <p className="text-sm text-destructive">{voucherError}</p>}
                            </>
                        )}
                    </div>
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
                </>
            )}
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
            <Button variant="outline" className="w-full" asChild><Link href="/contact">Contact Sales</Link></Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
