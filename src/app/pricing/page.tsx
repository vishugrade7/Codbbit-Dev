
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/app/stripe/actions';


export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const { user, userData } = useAuth();
  const isIndianUser = userData?.country === 'India';
  const { toast } = useToast();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const plans = useMemo(() => {
    // NOTE: Replace these with your actual Stripe Price IDs from your Stripe dashboard.
    const priceData = {
        inr: {
            monthly: { price: 499, id: 'price_REPLACE_WITH_INR_MONTHLY_ID' },
            biannually: { price: 415, id: 'price_REPLACE_WITH_INR_BIANNUALLY_ID' },
            annually: { price: 333, id: 'price_REPLACE_WITH_INR_ANNUALLY_ID' },
            biannualTotal: 2490,
            annualTotal: 3996
        },
        usd: {
            monthly: { price: 12, id: 'price_REPLACE_WITH_USD_MONTHLY_ID' },
            biannually: { price: 10, id: 'price_REPLACE_WITH_USD_BIANNUALLY_ID' },
            annually: { price: 8, id: 'price_REPLACE_WITH_USD_ANNUALLY_ID' },
            biannualTotal: 60,
            annualTotal: 96
        }
    };

    const currency = isIndianUser ? "₹" : "$";
    const prices = isIndianUser ? priceData.inr : priceData.usd;

    return {
      monthly: {
        price: prices.monthly.price,
        id: prices.monthly.id,
        suffix: "/month",
        total: "Billed monthly.",
        currency: currency,
        save: null,
      },
      biannually: {
        price: prices.biannually.price,
        id: prices.biannually.id,
        suffix: "/month",
        total: `Billed ${currency}${prices.biannualTotal} every 6 months.`,
        save: "16%",
        currency: currency,
      },
      annually: {
        price: prices.annually.price,
        id: prices.annually.id,
        suffix: "/month",
        total: `Billed ${currency}${prices.annualTotal} annually.`,
        save: "33%",
        currency: currency,
      },
      free: {
        currency: currency,
      }
    };
  }, [isIndianUser]);

  const currentPlan = plans[billingCycle as keyof Omit<typeof plans, 'free'>];
  const freePlan = plans.free;

  const handleUpgrade = async (priceId: string) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Logged In', description: 'Please log in to upgrade your plan.' });
        router.push('/login');
        return;
    }
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Stripe is not configured correctly.' });
        return;
    }
     if (priceId.includes('REPLACE_WITH')) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Stripe Price IDs have not been set. Please contact support.' });
        return;
    }

    setIsCheckingOut(true);
    const response = await createCheckoutSession(priceId, user.uid);
    
    if (response.error || !response.sessionId) {
        toast({ variant: 'destructive', title: 'Checkout Error', description: response.error || 'Could not initiate checkout.' });
        setIsCheckingOut(false);
        return;
    }
    
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    if (!stripe) {
         toast({ variant: 'destructive', title: 'Stripe Error', description: 'Stripe.js failed to load.' });
         setIsCheckingOut(false);
         return;
    }

    const { error } = await stripe.redirectToCheckout({ sessionId: response.sessionId });
    if (error) {
        toast({ variant: 'destructive', title: 'Redirect Error', description: error.message || 'Failed to redirect to Stripe.' });
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
                <p className="text-xs text-muted-foreground mt-1">{currentPlan.total}</p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Everything in Free</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Access to all premium problems</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Advanced analytics & insights</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => handleUpgrade(currentPlan.id)} disabled={isCheckingOut}>
                {isCheckingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Upgrade to Pro'}
              </Button>
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
