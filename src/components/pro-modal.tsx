
"use client";

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createRazorpayOrder, isRazorpayConfigured } from '@/app/razorpay/actions';
import Testimonials from './testimonials';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Carousel, CarouselContent, CarouselItem } from './ui/carousel';

const testimonials = [
  {
    quote: "As a UX writer, I'm always struggling to find visuals that fit my text/support my ideas. Blush does that! <3",
    name: "Camille Promérat",
    role: "UX Writer",
    avatar: { src: "https://placehold.co/40x40.png", hint: "woman face" },
  },
   {
    quote: "Codbbit has been a game-changer for my interview prep. The variety of problems is amazing.",
    name: "John Doe",
    role: "Salesforce Developer",
    avatar: { src: "https://placehold.co/40x40.png", hint: "man face" },
  },
];


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

export const ProModal = () => {
    const { isOpen, setIsOpen } = useProModal();
    const { user, userData } = useAuth();
    const isIndianUser = userData?.country === 'India';
    const { toast } = useToast();
    const router = useRouter();

    const [billingCycle, setBillingCycle] = useState<'annually' | 'biannually' | 'monthly'>("annually");
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isRazorpayReady, setIsRazorpayReady] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [allPlans, setAllPlans] = useState<any>(null);
    const [loadingPlans, setLoadingPlans] = useState(true);

    useEffect(() => {
        const checkConfigAndFetchPlans = async () => {
            setLoadingConfig(true);
            setLoadingPlans(true);
            
            const configured = await isRazorpayConfigured();
            setIsRazorpayReady(configured);
            setLoadingConfig(false);

            if (!db) {
                setLoadingPlans(false);
                return;
            }
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
        };
        checkConfigAndFetchPlans();
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
        };
    };

    const monthlyPlan = getPlanDetails('monthly');
    const biannualPlan = getPlanDetails('biannually');
    const annualPlan = getPlanDetails('annually');
    
    const getSavings = (plan: ReturnType<typeof getPlanDetails>) => {
        if (!plan || !monthlyPlan || plan.id === 'monthly') return null;
        const monthlyTotal = monthlyPlan.price * (plan.id === 'annually' ? 12 : 6);
        const savings = 100 - (plan.total / monthlyTotal * 100);
        return Math.round(savings);
    }
    
    const selectedPlan = useMemo(() => {
      switch (billingCycle) {
          case 'annually': return annualPlan;
          case 'biannually': return biannualPlan;
          default: return monthlyPlan;
      }
    }, [billingCycle, annualPlan, biannualPlan, monthlyPlan]);


    const handleUpgrade = async () => {
        if (!user || !userData) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'Please log in to upgrade your plan.' });
            router.push('/login');
            return;
        }
        if (!isRazorpayReady) {
             toast({ variant: 'destructive', title: 'Configuration Error', description: 'Payment processing is not configured. Contact admin.' });
            return;
        }
        if (!selectedPlan) {
            toast({ variant: 'destructive', title: 'Plan not available.' });
            return;
        }
        
        setIsCheckingOut(true);
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            toast({ variant: 'destructive', title: 'Payment Error', description: 'Could not load payment script.' });
            setIsCheckingOut(false);
            return;
        }

        const orderResponse = await createRazorpayOrder(selectedPlan.total, selectedPlan.currencyCode);
        if (orderResponse.error || !orderResponse.orderId) {
            toast({ variant: 'destructive', title: 'Checkout Error', description: orderResponse.error || 'Could not create an order.' });
            setIsCheckingOut(false);
            return;
        }
        // Razorpay handler logic needs to be implemented here based on how you have it in pricing/page.tsx
        // ... (This would be the same Razorpay options and handler logic)
         setIsCheckingOut(false); // For now, just reset
         setIsOpen(false); // Close modal on click
         router.push('/pricing'); // Redirect to full pricing page to complete
    };


    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-4xl p-0">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-8 flex flex-col">
                        <h2 className="text-2xl font-bold font-headline">Plan Details</h2>
                        <p className="text-muted-foreground mt-2 mb-6">Upgrade to Pro to unlock all features and accelerate your learning.</p>
                        
                        <RadioGroup value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)} className="space-y-4">
                            {monthlyPlan && (
                                <Label htmlFor="monthly" className={cn("flex items-center gap-4 p-4 border rounded-lg cursor-pointer", billingCycle === 'monthly' && "border-primary ring-2 ring-primary")}>
                                     <RadioGroupItem value="monthly" id="monthly" />
                                     <div className="flex-1">
                                        <p className="font-semibold">Monthly</p>
                                        <p className="text-muted-foreground text-sm">{monthlyPlan.currency}{monthlyPlan.price} per month</p>
                                     </div>
                                </Label>
                            )}
                             {biannualPlan && (
                                <Label htmlFor="biannually" className={cn("flex items-center gap-4 p-4 border rounded-lg cursor-pointer", billingCycle === 'biannually' && "border-primary ring-2 ring-primary")}>
                                     <RadioGroupItem value="biannually" id="biannually" />
                                     <div className="flex-1">
                                        <p className="font-semibold">6 Months</p>
                                        <p className="text-muted-foreground text-sm">{biannualPlan.currency}{biannualPlan.total} billed every 6 months</p>
                                     </div>
                                     {getSavings(biannualPlan) && <div className="bg-foreground text-background text-xs font-bold px-2 py-1 rounded-full">{getSavings(biannualPlan)}% off</div>}
                                </Label>
                            )}
                             {annualPlan && (
                                <Label htmlFor="annually" className={cn("flex items-center gap-4 p-4 border rounded-lg cursor-pointer", billingCycle === 'annually' && "border-primary ring-2 ring-primary")}>
                                     <RadioGroupItem value="annually" id="annually" />
                                     <div className="flex-1">
                                        <p className="font-semibold">Yearly</p>
                                        <p className="text-muted-foreground text-sm">{annualPlan.currency}{annualPlan.total} billed annually</p>
                                     </div>
                                     {getSavings(annualPlan) && <div className="bg-foreground text-background text-xs font-bold px-2 py-1 rounded-full">{getSavings(annualPlan)}% off</div>}
                                </Label>
                            )}
                        </RadioGroup>
                        <Button className="mt-auto" size="lg" onClick={() => router.push('/pricing')}>
                            Continue to Payment
                        </Button>
                    </div>
                    <div className="hidden md:flex flex-col items-center justify-center bg-primary/10 p-8 text-center">
                        <Image
                            src="https://placehold.co/600x400.png"
                            alt="Team illustration"
                            width={300}
                            height={200}
                            data-ai-hint="team working illustration"
                            className="mb-8"
                        />
                        <Carousel className="w-full max-w-xs" opts={{loop: true}}>
                          <CarouselContent>
                            {testimonials.map((testimonial, index) => (
                              <CarouselItem key={index}>
                                <div className="p-1">
                                  <p className="text-foreground/80 italic mb-4">"{testimonial.quote}"</p>
                                  <div className="flex items-center justify-center gap-3">
                                      <Avatar className="h-10 w-10 border-2 border-primary/30">
                                          <AvatarImage src={testimonial.avatar.src} alt={testimonial.name} data-ai-hint={testimonial.avatar.hint} />
                                          <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                          <p className="font-semibold">{testimonial.name}</p>
                                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                      </div>
                                  </div>
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                        </Carousel>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// Create a context for the modal
type ProModalContextType = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
};

const ProModalContext = createContext<ProModalContextType | null>(null);

export const ProModalProvider = ({ children }: { children: React.ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <ProModalContext.Provider value={{ isOpen, setIsOpen }}>
            {children}
            <ProModal />
        </ProModalContext.Provider>
    );
};

export const useProModal = () => {
    const context = useContext(ProModalContext);
    if (!context) {
        throw new Error('useProModal must be used within a ProModalProvider');
    }
    return context;
};
